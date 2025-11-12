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

type SimOk = { ok: true }
type SimFail = { ok: false; err: unknown; errStr?: string; logs?: string[] }
type SimResult = SimOk | SimFail

const stringifyErr = (err: unknown): string => {
  if (err == null) return ''
  if (typeof err === 'string') return err
  if (typeof err === 'object' && 'message' in (err as any) && (err as any).message) {
    return String((err as any).message)
  }
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
const PRIORITY_FEE_MICRO_LAMPORTS = 20_000 // adjust if network is congested

// ---------------------------------------------------------------------------

export function useBurnNfts({ deepClean = true }: { deepClean?: boolean } = {}) {
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
    async (owner: PublicKey, ixs: TransactionInstruction[], label?: string): Promise<SimResult> => {
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
          const err = sim.value.err
          const logs = sim.value.logs ?? []
          console.log('[burn/sim failed]', label, err, logs.slice(-12))
          return { ok: false, err, errStr: stringifyErr(err), logs }
        }
        console.log('[burn/sim ok]', label)
        return { ok: true }
      } catch (e: unknown) {
        const eStr = stringifyErr(e)
        console.log('[burn/sim threw]', label, eStr)
        return { ok: false, err: e, errStr: eStr }
      }
    },
    [connection],
  )

  const resolveUserTokenAccount = useCallback(
    async ({
      mint,
      owner,
      preferred,
      programIdHint,
    }: {
      mint: PublicKey
      owner: PublicKey
      preferred?: PublicKey
      programIdHint?: PublicKey
    }): Promise<{ tokenAccount: PublicKey; programId: PublicKey }> => {
      const check = async (pk?: PublicKey | null) => {
        if (!pk) return null
        const ai = await connection.getAccountInfo(pk, { commitment: 'processed' })
        if (!ai) return null
        let amount = 0
        try {
          const b = await connection.getTokenAccountBalance(pk, 'processed')
          amount = Number(b.value.amount ?? 0)
        } catch {}
        const prog = ai.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
        return { pk, amount, prog }
      }

      let cand = await check(preferred)
      if (cand && cand.amount > 0) {
        console.log('burn/resolveTA — preferred ok', preferred!.toBase58(), 'amt=', cand.amount)
        return { tokenAccount: cand.pk, programId: cand.prog }
      }

      const hinted = programIdHint ?? (await getMintProgramId(mint))
      const { ata } = await resolveAtaByMintProgram(mint, owner, hinted)
      cand = await check(ata)
      if (cand && cand.amount > 0) {
        console.log('burn/resolveTA — ATA ok', ata.toBase58(), 'amt=', cand.amount)
        return { tokenAccount: cand.pk, programId: cand.prog }
      }

      const list = await connection.getTokenAccountsByOwner(owner, { mint }, 'processed')
      for (const it of list.value) {
        const c = await check(it.pubkey)
        if (c && c.amount > 0) {
          console.log('burn/resolveTA — found non-ATA', it.pubkey.toBase58(), 'amt=', c.amount)
          return { tokenAccount: c.pk, programId: c.prog }
        }
      }

      throw new Error('No token account with balance for this mint')
    },
    [connection, getMintProgramId, resolveAtaByMintProgram],
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
      tokenProgramId: PublicKey,
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
          ...(tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)
            ? { splTokenProgram: umiPk(TOKEN_2022_PROGRAM_ID.toBase58()) }
            : {}),
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

  // ---------- legacy TM NFT (non-pNFT) ---------------------------------------
  const buildLegacyTmBurnVariants = useCallback(
    async ({
      owner,
      mint,
      tokenAccount,
      tokenProgramId,
      collectionMint,
    }: {
      owner: PublicKey
      mint: PublicKey
      tokenAccount: PublicKey
      tokenProgramId: PublicKey
      collectionMint?: PublicKey
    }): Promise<{ withCollection: TransactionInstruction[]; withoutCollection: TransactionInstruction[] } | null> => {
      try {
        const mintU = umiPk(mint.toBase58())
        const ownerU = umiPk(owner.toBase58())
        const tokenU = umiPk(tokenAccount.toBase58())
        umi.use(signerIdentity(createNoopSigner(ownerU)))

        // Metadata (mandatory)
        const mdPda = findMetadataPda(umi, { mint: mintU })
        const mdAi = await connection.getAccountInfo(new PublicKey(mdPda[0]), { commitment: 'processed' })
        if (!mdAi) return null

        // MasterEdition (optional)
        const mePda = findMasterEditionPda(umi, { mint: mintU })
        const meAi = await connection.getAccountInfo(new PublicKey(mePda[0]), { commitment: 'processed' })
        const hasME = !!meAi

        // Accounts of the collection (if hint)
        let collMintU: ReturnType<typeof umiPk> | undefined
        let collMdPda: any | undefined
        let collMePda: any | undefined
        if (collectionMint) {
          collMintU = umiPk(collectionMint.toBase58())
          collMdPda = findMetadataPda(umi, { mint: collMintU })
          const _collMe = findMasterEditionPda(umi, { mint: collMintU })
          const _collMeAi = await connection.getAccountInfo(new PublicKey(_collMe[0]), { commitment: 'processed' })
          if (_collMeAi) collMePda = _collMe
        }

        const maybeSplTokenProgram = tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)
          ? { splTokenProgram: umiPk(TOKEN_2022_PROGRAM_ID.toBase58()) }
          : {}

        const common: any = {
          mint: mintU,
          tokenOwner: ownerU,
          token: tokenU,
          metadata: mdPda,
          ...(hasME ? { edition: mePda } : {}),
          authority: createNoopSigner(ownerU),
          burnArgs: { amount: 1n, authorizationData: null },
          ...maybeSplTokenProgram,
        }

        const make = (includeCollection: boolean) => {
          const burn = burnV1(umi, {
            ...common,
            ...(includeCollection && collMintU
              ? {
                  collectionMint: collMintU,
                  collectionMetadata: collMdPda,
                  ...(collMePda ? { collectionMasterEdition: collMePda } : {}),
                }
              : {}),
          } as any)

          return ((burn as any).items as { instruction: any }[]).map((it) => toWeb3JsInstruction(it.instruction))
        }

        const withoutCollection = make(false)
        const withCollection = collMintU ? make(true) : []

        return { withCollection, withoutCollection }
      } catch {
        return null
      }
    },
    [umi, connection],
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

        // 1) Simulation (diagnostic)
        const simRes = await simulateIxs(owner, ixs, `batch(${group.length})`)
        console.log('sendGroups — after sim', { ok: simRes.ok, err: simRes.ok ? undefined : simRes.errStr })

        if (!simRes.ok) {
          const tooLarge = isTooLargeErr(simRes.errStr ?? stringifyErr(simRes.err))
          if (tooLarge) {
            if (group.length > 1) {
              const mid = Math.floor(group.length / 2)
              console.log('sendGroups — tx too large, splitting', group.length, '->', mid, '+', group.length - mid)
              queue.unshift(group.slice(0, mid), group.slice(mid))
              continue
            }
            console.log('sendGroups — single item still too large, sending anyway')
          }
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
          const msg = (e?.message ?? String(e)).toLowerCase()
            console.log('sendGroups — wallet/send error', msg)
          if (msg.includes('reject') || msg.includes('denied') || msg.includes('cancel')) {
            continue
          }
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
              // simulation for logging (non-blocking)
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
          const { tokenAccount, programId } = await resolveUserTokenAccount({
            mint: it.mint,
            owner,
            preferred: it.tokenAccount,
            programIdHint: it.programIdHint,
          })
          console.log('burn/pick TA', mint58, tokenAccount.toBase58(), 'prog=', programId.toBase58())

          let pnftIxs: TransactionInstruction[] | null = null

          {
            const variants = await buildPnftVariants(owner, it.mint, tokenAccount!, programId, it.collectionMintHint)
            if (variants) {
              const preferUnlock = it.frozenHint === true
              const tries = preferUnlock
                ? [
                    { name: 'unlock+burn (with rules)', ixs: variants.unlockThenBurnWithRules },
                    { name: 'unlock+burn (no rules)', ixs: variants.unlockThenBurn },
                    { name: 'burn only (with rules)', ixs: variants.burnOnlyWithRules },
                    { name: 'burn only (no rules)', ixs: variants.burnOnly },
                  ]
                : [
                    { name: 'burn only (with rules)', ixs: variants.burnOnlyWithRules },
                    { name: 'burn only (no rules)', ixs: variants.burnOnly },
                    { name: 'unlock+burn (with rules)', ixs: variants.unlockThenBurnWithRules },
                    { name: 'unlock+burn (no rules)', ixs: variants.unlockThenBurn },
                  ]

              for (const cand of tries) {
                if (!cand.ixs?.length) continue
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
              }
            }
          }

          if (deepClean && pnftIxs) {
            prepared.push({ mint: it.mint, ixs: [...pnftIxs], kind: 'pnft' })
            } else if (deepClean && it.isPnftHint) {
            skipped.push({ mint: mint58, reason: 'pnft: no viable unlock/burn path (sim failed)' })
            continue
          } else if (deepClean) {
            const legacyVariants = await buildLegacyTmBurnVariants({
              owner,
              mint: it.mint,
              tokenAccount: tokenAccount!,
              tokenProgramId: programId,
              collectionMint: it.collectionMintHint,
            })

            if (legacyVariants) {
              const order = [
                { name: 'legacy with collection', ixs: legacyVariants.withCollection },
                { name: 'legacy without collection', ixs: legacyVariants.withoutCollection },
              ]
              let picked: TransactionInstruction[] | null = null
              for (const cand of order) {
                if (!cand.ixs || cand.ixs.length === 0) continue
                const sim = await simulateIxs(
                  owner,
                  [
                    ComputeBudgetProgram.setComputeUnitLimit({ units: CB_UNITS }),
                    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
                    ...cand.ixs,
                  ],
                  `legacy-tm-pick ${cand.name}`,
                )
                if (sim.ok) {
                  picked = cand.ixs
                  break
                } else {
                  console.log('legacy-tm-pick failed logs:', (sim as any).logs?.slice(-12))
                }
              }

              if (picked) {
                console.log('legacy TM picked →', picked.length, 'ix')
                prepared.push({ mint: it.mint, kind: 'spl', ixs: picked })
              } else {
                // fallback SPL pur
                console.log('legacy TM failed → fallback SPL pur')
                prepared.push({
                  mint: it.mint,
                  kind: 'spl',
                  ixs: [
                    createBurnInstruction(tokenAccount!, it.mint, owner, 1n, [], programId),
                    createCloseAccountInstruction(tokenAccount!, owner, owner, [], programId),
                  ],
                })
              }
            } else {
              // pas de Metadata → SPL pur
              prepared.push({
                mint: it.mint,
                kind: 'spl',
                ixs: [
                  createBurnInstruction(tokenAccount!, it.mint, owner, 1n, [], programId),
                  createCloseAccountInstruction(tokenAccount!, owner, owner, [], programId),
                ],
              })
            }
          } else {
            // deepClean deactivated → SPL pur (simple and fast)
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
      const heavyCount = prepared.filter((p) => p.kind !== 'spl').length
      const MAX_PER_TX = heavyCount === 0 ? 16 : 6

      const groups: Group[][] = []
      for (let i = 0; i < prepared.length; i += MAX_PER_TX) {
        const slice = prepared.slice(i, i + MAX_PER_TX).map(({ mint, ixs }) => ({ mint, ixs }))
        if (slice.length) groups.push(slice)
      }

      console.log('mutateAsync — groups', groups.length, 'size per tx target =', MAX_PER_TX)

      if (groups.length === 0) return { ok: [], skipped }
      console.log('mutateAsync — groups', groups.length, 'size per tx target =', MAX_PER_TX)

      const ok = await sendGroups(owner, groups)
      return { ok, skipped }
    },
    [
      account?.publicKey,
      buildPnftVariants,
      buildCoreBurnVariants,
      buildLegacyTmBurnVariants,
      sendGroups,
      simulateIxs,
      deepClean,
      resolveUserTokenAccount,
    ],
  )

  return { mutateAsync }
}
