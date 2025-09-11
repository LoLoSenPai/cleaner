// hooks/use-burn-nfts.ts

import { useConnection } from '@/components/solana/solana-provider'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import { useCallback, useMemo } from 'react'

// Umi / Metaplex
import {
  burn as coreBurn,
  collectionAddress as coreCollectionAddress,
  fetchAsset as coreFetchAsset,
  fetchCollection as coreFetchCollection,
  mplCore,
} from '@metaplex-foundation/mpl-core'
import {
  burnV1,
  fetchMetadata,
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
  mplTokenMetadata,
  unlockV1,
} from '@metaplex-foundation/mpl-token-metadata'
import { createNoopSigner, signerIdentity, publicKey as umiPk } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'

// ---------------------------------------------------------------------------

export type NftBurnItem = {
  mint: PublicKey
  tokenAccount?: PublicKey
  isCompressed?: boolean
  isPnftHint?: boolean
  isCoreHint?: boolean
  programIdHint?: PublicKey
  frozenHint?: boolean
  collectionMintHint?: PublicKey
}

type Kind = 'spl' | 'pnft' | 'core'
type Group = { mint: PublicKey; ixs: TransactionInstruction[] }

export type BurnOk = { mint: string; sig: string }
export type BurnSkip = { mint: string; reason: string }
export type BurnBatchResult = { ok: BurnOk[]; skipped: BurnSkip[] }

// ---------------------------------------------------------------------------
// Tunables (close to Incinerator behavior)
// ---------------------------------------------------------------------------

const CB_UNITS = 1_000_000
const PRIORITY_FEE_MICRO_LAMPORTS = 8_000 // adjust if network busy

// ---------------------------------------------------------------------------

export function useBurnNfts() {
  const { account, signAndSendTransaction } = useWalletUi()
  const connection = useConnection()

  const umi = useMemo(() => {
    const endpoint: string = (connection as any)?._rpcEndpoint ?? ''
    return createUmi(endpoint).use(mplTokenMetadata()).use(mplCore())
  }, [connection])

  // ---------- helpers -------------------------------------------------------

  const getMintProgramId = useCallback(
    async (mint: PublicKey) => {
      const info = await connection.getAccountInfo(mint, { commitment: 'processed' })
      if (!info) throw new Error(`Mint not found: ${mint.toBase58()}`)
      return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    },
    [connection],
  )

  const resolveAtaByMintProgram = useCallback(async (mint: PublicKey, owner: PublicKey, programId: PublicKey) => {
    const ata = await getAssociatedTokenAddress(mint, owner, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID)
    return { ata, programId }
  }, [])

  const simulateIxs = useCallback(
    async (owner: PublicKey, ixs: TransactionInstruction[], label?: string) => {
      const { value } = await connection.getLatestBlockhashAndContext('processed')
      const msg = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: value.blockhash,
        instructions: ixs,
      }).compileToV0Message()
      const tx = new VersionedTransaction(msg)
      const sim = await connection.simulateTransaction(tx, { commitment: 'processed', sigVerify: false })
      if (sim.value.err) {
        const logs = sim.value.logs ?? []
        console.log('[burn/sim failed]', label, sim.value.err, logs.slice(-12))
        return { ok: false as const, err: sim.value.err, logs }
      }
      return { ok: true as const }
    },
    [connection],
  )

  // ---------- Core (mpl-core) ----------------------------------------------

  const buildCoreBurnVariants = useCallback(
    async (
      owner: PublicKey,
      assetId: PublicKey,
    ): Promise<{
      withCollection: TransactionInstruction[]
      withoutCollection: TransactionInstruction[]
    }> => {
      const ownerU = umiPk(owner.toBase58())
      const assetU = umiPk(assetId.toBase58())
      umi.use(signerIdentity(createNoopSigner(ownerU)))

      const asset = await coreFetchAsset(umi, assetU)

      // builder sans collection
      const bNo = coreBurn(umi, { asset })
      const iNo = ((bNo as any).items as { instruction: any }[]).map((it) => toWeb3JsInstruction(it.instruction))

      // builder avec collection (si résoluble)
      let iYes: TransactionInstruction[] = []
      try {
        const collAddr = coreCollectionAddress(asset)
        if (collAddr) {
          const collection = await coreFetchCollection(umi, collAddr)
          const bYes = coreBurn(umi, { asset, collection })
          iYes = ((bYes as any).items as { instruction: any }[]).map((it) => toWeb3JsInstruction(it.instruction))
        }
      } catch {
        // pas de collection valide
      }

      return { withCollection: iYes, withoutCollection: iNo }
    },
    [umi],
  )

  // ---------- pNFT (Token Metadata) ----------------------------------------

  const buildPnftVariants = useCallback(
    async (
      owner: PublicKey,
      mint: PublicKey,
      tokenAccount: PublicKey,
      collectionMint?: PublicKey,
    ): Promise<{
      burnOnly: TransactionInstruction[]
      unlockThenBurn: TransactionInstruction[]
      burnOnlyWithRules?: TransactionInstruction[]
      unlockThenBurnWithRules?: TransactionInstruction[]
    } | null> => {
      try {
        const mintU = umiPk(mint.toBase58())
        const ownerU = umiPk(owner.toBase58())
        const tokenU = umiPk(tokenAccount.toBase58())

        const metadata = findMetadataPda(umi, { mint: mintU })
        const edition = findMasterEditionPda(umi, { mint: mintU })
        const tokenRecord = findTokenRecordPda(umi, { mint: mintU, token: tokenU })

        // pNFT si TokenRecord existe
        const trAcc = await umi.rpc.getAccount(tokenRecord[0]).catch(() => null)
        if (!trAcc) return null

        // collection (optionnel)
        let collMintU: ReturnType<typeof umiPk> | undefined
        let collMetadataPda: any | undefined
        if (collectionMint) {
          collMintU = umiPk(collectionMint.toBase58())
          collMetadataPda = findMetadataPda(umi, { mint: collMintU })
        }

        // ruleset (optionnel)
        let ruleSetU: ReturnType<typeof umiPk> | undefined
        try {
          const md = await fetchMetadata(umi, mintU)
          const rs = (md as any)?.programmableConfig?.ruleSet
          if (rs) ruleSetU = umiPk(String(rs))
        } catch {}

        umi.use(signerIdentity(createNoopSigner(ownerU)))

        const common = {
          mint: mintU,
          tokenOwner: ownerU,
          token: tokenU,
          metadata,
          edition,
          tokenRecord,
          authority: createNoopSigner(ownerU),
          ...(collMintU ? { collectionMint: collMintU, collectionMetadata: collMetadataPda } : {}),
        } as any

        const makeBurn = (withRules: boolean) => {
          const b = burnV1(umi, {
            ...common,
            ...(withRules && ruleSetU ? { authorizationRules: ruleSetU } : {}),
            burnArgs: { amount: 1n, authorizationData: null },
          } as any)
          const items = (b as any).items as { instruction: any }[]
          return items.map((it) => toWeb3JsInstruction(it.instruction))
        }

        const makeUnlock = () => {
          const u = unlockV1(umi, { ...common } as any)
          const items = (u as any).items as { instruction: any }[]
          return items.map((it) => toWeb3JsInstruction(it.instruction))
        }

        const burnOnly = makeBurn(false)
        const unlockThenBurn = [...makeUnlock(), ...makeBurn(false)]
        const burnOnlyWithRules = ruleSetU ? makeBurn(true) : undefined
        const unlockThenBurnWithRules = ruleSetU ? [...makeUnlock(), ...makeBurn(true)] : undefined

        return { burnOnly, unlockThenBurn, burnOnlyWithRules, unlockThenBurnWithRules }
      } catch {
        return null
      }
    },
    [umi],
  )

  // ---------- final sending (no pre-split on sim fail) ---------------------

  const sendGroups = useCallback(
    async (owner: PublicKey, groups: Group[][]) => {
      const ok: { mint: string; sig: string }[] = []

      for (const group of groups) {
        const ixs: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
          ...group.flatMap((g) => g.ixs),
        ]

        // Simule juste pour log (on n’éclate pas si ça échoue)
        await simulateIxs(owner, ixs, `batch(${group.length})`)

        const { context, value } = await connection.getLatestBlockhashAndContext('processed')
        const msg = new TransactionMessage({
          payerKey: owner,
          recentBlockhash: value.blockhash,
          instructions: ixs,
        }).compileToV0Message()
        const tx = new VersionedTransaction(msg)
        const sig = await signAndSendTransaction(tx, context.slot)
        ok.push(...group.map(({ mint }) => ({ mint: mint.toBase58(), sig })))
      }

      return ok
    },
    [connection, signAndSendTransaction, simulateIxs],
  )

  // ---------- main ----------------------------------------------------------

  const mutateAsync = useCallback(
    async (rawItems: NftBurnItem[]): Promise<BurnBatchResult> => {
      if (!account?.publicKey) throw new Error('Wallet not connected')
      const owner = account.publicKey

      const skipped: BurnSkip[] = []
      const prepared: { mint: PublicKey; ixs: TransactionInstruction[]; kind: Kind }[] = []

      for (const it of rawItems) {
        const mint58 = it.mint.toBase58()
        if (it.isCompressed) {
          skipped.push({ mint: mint58, reason: 'cNFT not supported' })
          continue
        }

        // Core
        if (it.isCoreHint) {
          const { withCollection, withoutCollection } = await buildCoreBurnVariants(owner, it.mint)
          const tries: { name: string; ixs: TransactionInstruction[] }[] = []
          if (withCollection.length) tries.push({ name: 'core burn (with collection)', ixs: withCollection })
          if (withoutCollection.length) tries.push({ name: 'core burn (without collection)', ixs: withoutCollection })

          let chosen: TransactionInstruction[] | null = null
          let lastErr = 'no variants'
          for (const t of tries) {
            const res = await simulateIxs(
              owner,
              [
                ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
                ...t.ixs,
              ],
              t.name,
            )
            if (res.ok) {
              chosen = t.ixs
              break
            }
            lastErr = JSON.stringify(res.err)
          }
          if (!chosen) {
            skipped.push({ mint: mint58, reason: `core burn simulation failed (${lastErr})` })
            continue
          }
          prepared.push({ mint: it.mint, ixs: chosen, kind: 'core' })
          continue
        }

        // Mint program → ATA
        let programId = it.programIdHint ?? (await getMintProgramId(it.mint))

        let tokenAccount = it.tokenAccount
        if (!tokenAccount) {
          tokenAccount = (await resolveAtaByMintProgram(it.mint, owner, programId)).ata
        } else {
          const ai = await connection.getAccountInfo(tokenAccount, { commitment: 'processed' })
          if (!ai) {
            skipped.push({ mint: mint58, reason: 'token account not found' })
            continue
          }
          const ataProgram = ai.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
          if (!ataProgram.equals(programId)) {
            tokenAccount = (await resolveAtaByMintProgram(it.mint, owner, programId)).ata
          }
        }

        // pNFT?
        let pnftIxs: TransactionInstruction[] | null = null
        if (it.isPnftHint) {
          const variants = await buildPnftVariants(owner, it.mint, tokenAccount!, it.collectionMintHint)
          if (variants) {
            const seq = it.frozenHint
              ? [
                  { name: 'unlock+burn (no rules)', ixs: variants.unlockThenBurn },
                  { name: 'unlock+burn (with rules)', ixs: variants.unlockThenBurnWithRules },
                  { name: 'burn only (no rules)', ixs: variants.burnOnly },
                  { name: 'burn only (with rules)', ixs: variants.burnOnlyWithRules },
                ]
              : [
                  { name: 'burn only (no rules)', ixs: variants.burnOnly },
                  { name: 'burn only (with rules)', ixs: variants.burnOnlyWithRules },
                  { name: 'unlock+burn (no rules)', ixs: variants.unlockThenBurn },
                  { name: 'unlock+burn (with rules)', ixs: variants.unlockThenBurnWithRules },
                ]
            for (const cand of seq) {
              if (!cand.ixs || cand.ixs.length === 0) continue
              const sim = await simulateIxs(
                owner,
                [
                  ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
                  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
                  ...cand.ixs,
                ],
                cand.name,
              )
              if (sim.ok) {
                pnftIxs = cand.ixs
                break
              }
            }
            if (!pnftIxs) {
              skipped.push({ mint: mint58, reason: 'pNFT burn simulation failed' })
              continue
            }
          }
        }

        if (pnftIxs) {
          prepared.push({ mint: it.mint, ixs: [...pnftIxs], kind: 'pnft' })
        } else {
          prepared.push({
            mint: it.mint,
            kind: 'spl',
            ixs: [
              createBurnInstruction(tokenAccount!, it.mint, owner, 1n, [], programId),
              createCloseAccountInstruction(tokenAccount!, owner, owner, [], programId),
            ],
          })
        }
      }

      // -------- pack groups preserving selection order --------
      const hasHeavy = prepared.some((p) => p.kind !== 'spl')
      const MAX_PER_TX = hasHeavy ? 6 : 16

      const groups: Group[][] = []
      for (let i = 0; i < prepared.length; i += MAX_PER_TX) {
        const slice = prepared.slice(i, i + MAX_PER_TX).map(({ mint, ixs }) => ({ mint, ixs }))
        groups.push(slice)
      }

      const ok = await sendGroups(owner, groups)
      return { ok, skipped }
    },
    [
      account?.publicKey,
      connection,
      getMintProgramId,
      resolveAtaByMintProgram,
      simulateIxs,
      buildPnftVariants,
      buildCoreBurnVariants,
      sendGroups,
    ],
  )

  return { mutateAsync }
}
