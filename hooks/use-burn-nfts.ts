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

// --- error helpers ----------------------------------------------------------
const stringifyErr = (err: any): string => {
  if (!err) return ''
  if (typeof err === 'string') return err
  // Error object? -> take .message
  if (typeof err === 'object' && 'message' in err && err.message) return String((err as any).message)
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

const isTooLargeErr = (err: any): boolean => {
  const s = stringifyErr(err)
  return (
    s.includes('VersionedTransaction too large') ||
    s.includes('solana_transaction::versioned::VersionedTransaction too large') ||
    s.includes('transaction too large') ||
    s.includes('Transaction too large') ||
    s.includes('packet too large') ||
    s.includes('encoded/raw')
  )
}

export type BurnOk = { mint: string; sig: string }
export type BurnSkip = { mint: string; reason: string }
export type BurnBatchResult = { ok: BurnOk[]; skipped: BurnSkip[] }

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

const CB_UNITS = 1_000_000
const PRIORITY_FEE_MICRO_LAMPORTS = 20_000 // ajuste si réseau chargé

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
      try {
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
          const err = sim.value.err
          console.log('[burn/sim failed]', label, err, logs.slice(-12))
          return { ok: false as const, err, errStr: stringifyErr(err), logs }
        }
        console.log('[burn/sim ok]', label)
        return { ok: true as const }
      } catch (e: any) {
        const eStr = stringifyErr(e)
        console.log('[burn/sim threw]', label, eStr)
        // IMPORTANT : ne bloque pas l’envoi, mais renvoie l’erreur pour que l’autosplit puisse décider
        return { ok: false as const, err: e, errStr: eStr }
      }
    },
    [connection],
  )

  // ---------- Core (mpl-core) ----------------------------------------------

  const buildCoreBurnVariants = useCallback(
    async (
      owner: PublicKey,
      assetId: PublicKey,
    ): Promise<{ withCollection: TransactionInstruction[]; withoutCollection: TransactionInstruction[] }> => {
      const ownerU = umiPk(owner.toBase58())
      const assetU = umiPk(assetId.toBase58())
      umi.use(signerIdentity(createNoopSigner(ownerU)))

      const asset = await coreFetchAsset(umi, assetU)

      const bNo = coreBurn(umi, { asset })
      const withoutCollection = ((bNo as any).items as { instruction: any }[]).map((it) =>
        toWeb3JsInstruction(it.instruction),
      )

      let withCollection: TransactionInstruction[] = []
      try {
        const collAddr = coreCollectionAddress(asset)
        if (collAddr) {
          const collection = await coreFetchCollection(umi, collAddr)
          const bYes = coreBurn(umi, { asset, collection })
          withCollection = ((bYes as any).items as { instruction: any }[]).map((it) =>
            toWeb3JsInstruction(it.instruction),
          )
        }
      } catch {}

      return { withCollection, withoutCollection }
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

        const trAcc = await umi.rpc.getAccount(tokenRecord[0]).catch(() => null)
        if (!trAcc) return null

        let collMintU: ReturnType<typeof umiPk> | undefined
        let collMetadataPda: any | undefined
        if (collectionMint) {
          collMintU = umiPk(collectionMint.toBase58())
          collMetadataPda = findMetadataPda(umi, { mint: collMintU })
        }

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

  // ---------- final sending -------------------------------------------------

  const sendGroups = useCallback(
    async (owner: PublicKey, groups: Group[][]) => {
      const ok: { mint: string; sig: string }[] = []
      const queue: Group[][] = [...groups]

      while (queue.length) {
        const group = queue.shift()!

        const ixs: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
          ...group.flatMap((g) => g.ixs),
        ]

        console.log('sendGroups — building tx', {
          groupIndex: groups.length - queue.length,
          groupsTotal: groups.length,
          groupLen: group.length,
          ixsLen: ixs.length,
        })

        // 1) Simu (diagnostic)
        const simRes = await simulateIxs(owner, ixs, `batch(${group.length})`)
        console.log('sendGroups — after sim', { ok: simRes.ok, err: simRes.ok ? undefined : simRes.errStr })

        // 2) Trop gros ? on coupe en 2
        if (!simRes.ok && isTooLargeErr(simRes.errStr ?? simRes.err)) {
          if (group.length > 1) {
            const mid = Math.floor(group.length / 2)
            console.log('sendGroups — tx too large, splitting', group.length, '->', mid, '+', group.length - mid)
            queue.unshift(group.slice(0, mid), group.slice(mid))
            continue
          }
          console.log('sendGroups — single item still too large, sending anyway')
        }

        try {
          console.log('sendGroups — fetching blockhash...')
          const { context, value } = await connection.getLatestBlockhashAndContext('confirmed')
          console.log('sendGroups — got blockhash', { slot: context.slot })

          const msg = new TransactionMessage({
            payerKey: owner,
            recentBlockhash: value.blockhash,
            instructions: ixs,
          }).compileToV0Message()
          const tx = new VersionedTransaction(msg)

          console.log('sendGroups — calling wallet...', { minContextSlot: context.slot })
          const sig = await signAndSendTransaction(tx, context.slot)
          console.log('sendGroups — wallet returned sig', sig)

          ok.push(...group.map(({ mint }) => ({ mint: mint.toBase58(), sig })))
        } catch (e: any) {
          console.log('sendGroups — wallet/send error', stringifyErr(e))
          throw e
        }
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
        try {
          if (it.isCompressed) {
            skipped.push({ mint: mint58, reason: 'cNFT not supported' })
            continue
          }

          // ----- Core
          if (it.isCoreHint) {
            try {
              const { withCollection, withoutCollection } = await buildCoreBurnVariants(owner, it.mint)
              const chosen = (withCollection.length ? withCollection : withoutCollection) ?? []
              if (!chosen.length) {
                skipped.push({ mint: mint58, reason: 'core burn: no viable instructions' })
                continue
              }
              // simu pour log (non bloquante)
              await simulateIxs(
                owner,
                [
                  ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
                  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
                  ...chosen,
                ],
                'core-pick',
              )
              prepared.push({ mint: it.mint, ixs: chosen, kind: 'core' })
            } catch (e: any) {
              skipped.push({ mint: mint58, reason: `core build failed: ${e?.message ?? 'unknown'}` })
            }
            continue
          }

          // ----- SPL / pNFT
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

          let pnftIxs: TransactionInstruction[] | null = null
          if (it.isPnftHint) {
            const variants = await buildPnftVariants(owner, it.mint, tokenAccount!, it.collectionMintHint)
            if (variants) {
              // ---- Essaye d’abord BURN ONLY (with rules → no rules)
              const order = [
                { name: 'burn only (with rules)', ixs: variants.burnOnlyWithRules },
                { name: 'burn only (no rules)', ixs: variants.burnOnly },
                { name: 'unlock+burn (with rules)', ixs: variants.unlockThenBurnWithRules },
                { name: 'unlock+burn (no rules)', ixs: variants.unlockThenBurn },
              ]

              let lastErr: any = null
              for (const cand of order) {
                if (!cand.ixs || cand.ixs.length === 0) continue
                const sim = await simulateIxs(
                  owner,
                  [
                    ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
                    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
                    ...cand.ixs,
                  ],
                  `pnft-pick ${cand.name}`,
                )
                if (sim.ok) {
                  pnftIxs = cand.ixs
                  break
                }
                lastErr = sim.err
                // Si c’est un chemin "unlock" et qu’on voit 0x9e (InvalidAuthorityType), évite les autres "unlock"
                if (/\"Custom\"\s*:\s*158/.test(JSON.stringify(lastErr)) && cand.name.startsWith('unlock')) {
                  // on a déjà tenté burn-only en premier; on n’insiste pas sur unlock
                  break
                }
              }

              // fallback: même si la simu a échoué, on envoie le meilleur candidat burn-only
              if (!pnftIxs) {
                pnftIxs =
                  variants.burnOnlyWithRules ??
                  variants.burnOnly ??
                  variants.unlockThenBurnWithRules ??
                  variants.unlockThenBurn
              }

              if (!pnftIxs || pnftIxs.length === 0) {
                skipped.push({ mint: mint58, reason: 'pNFT: no viable instructions' })
                continue
              }
            }
          }

          if (pnftIxs) {
            prepared.push({ mint: it.mint, ixs: [...pnftIxs], kind: 'pnft' })
          } else {
            // Standard SPL / Token-2022
            prepared.push({
              mint: it.mint,
              kind: 'spl',
              ixs: [
                createBurnInstruction(tokenAccount!, it.mint, owner, 1n, [], programId),
                createCloseAccountInstruction(tokenAccount!, owner, owner, [], programId),
              ],
            })
          }
        } catch (e: any) {
          skipped.push({ mint: mint58, reason: `error: ${e?.message ?? 'unknown'}` })
        }
      }
      console.log(
        'burn debug — prepared',
        prepared.map((p) => ({ mint: p.mint.toBase58(), kind: p.kind, ixCount: p.ixs.length })),
        'skipped=',
        skipped,
      )

      // -------- grouping
      const hasHeavy = prepared.some((p) => p.kind !== 'spl')
      const MAX_PER_TX = hasHeavy ? 6 : 16

      const groups: Group[][] = []
      for (let i = 0; i < prepared.length; i += MAX_PER_TX) {
        const slice = prepared.slice(i, i + MAX_PER_TX).map(({ mint, ixs }) => ({ mint, ixs }))
        if (slice.length) groups.push(slice)
      }

      if (groups.length === 0) return { ok: [], skipped }
      console.log('mutateAsync — groups', groups.length, 'size per tx target =', MAX_PER_TX)

      const ok = await sendGroups(owner, groups)
      return { ok, skipped }
    },
    [
      account?.publicKey,
      connection,
      getMintProgramId,
      resolveAtaByMintProgram,
      buildPnftVariants,
      buildCoreBurnVariants,
      sendGroups,
      simulateIxs,
    ],
  )

  return { mutateAsync }
}
