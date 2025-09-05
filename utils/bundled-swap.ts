// utils/bundled-swap.ts
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { fetchLiteQuote } from '@/utils/jupiter-lite'
import { fetchSwapInstructions, jupToTxIxs } from '@/utils/jup-swap-instructions'

const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

export type DustItem = {
  mint: string
  amountBaseStr: string
  symbol?: string
}

export async function tryBuildBundledDustSwapTx(opts: {
  connection: Connection
  owner: PublicKey
  items: DustItem[]
  computeMargin?: number
  microLamports?: number
}): Promise<{ tx?: VersionedTransaction; usedIndices?: number[]; reason?: string }> {
  const { connection, owner, items, computeMargin = 1.15, microLamports = 0 } = opts
  if (!items.length) return { reason: 'no-items' }

  // 1) quote + swap-instructions pour les deux premiers éligibles
  const picked: { idx: number; setup: TransactionInstruction[]; swap: TransactionInstruction; luts: string[] }[] = []

  for (let i = 0; i < items.length && picked.length < 2; i++) {
    const it = items[i]
    try {
      const quote = await fetchLiteQuote({
        inputMint: it.mint,
        outputMint: WSOL_MINT.toBase58(),
        amountBaseUnits: it.amountBaseStr,
        slippage: 1, // 1%
      })
      if (!quote) continue
      const raw = await fetchSwapInstructions({
        quoteResponse: quote,
        userPublicKey: owner.toBase58(),
        useSharedAccounts: true,
      })
      const { setup, swap, luts } = jupToTxIxs(raw)
      picked.push({ idx: i, setup, swap, luts })
    } catch {
      // ignore this item if no route or API hiccup
    }
  }

  if (picked.length === 0) return { reason: 'no-routable-items' }

  // 2) build instruction list: WSOL ATA ensure, setups, swaps, single WSOL close
  const ixs: TransactionInstruction[] = []
  const wsolAta = getAssociatedTokenAddressSync(WSOL_MINT, owner)

  // ensure WSOL ATA (only if missing)
  const ataInfo = await opts.connection.getAccountInfo(wsolAta)
  if (!ataInfo) {
    ixs.push(createAssociatedTokenAccountInstruction(owner, wsolAta, owner, WSOL_MINT))
  }

  // concat setups & swaps
  for (const p of picked) {
    ixs.push(...p.setup)
  }
  for (const p of picked) {
    ixs.push(p.swap)
  }

  // single cleanup: close WSOL ATA -> SOL back to owner
  ixs.push(createCloseAccountInstruction(wsolAta, owner, owner, [], TOKEN_PROGRAM_ID))

  // 3) prepare LUTs & compute budget & blockhash
  const lutPubkeys = [...new Set(picked.flatMap((p) => p.luts))].map((s) => new PublicKey(s))
  const lookupFetches = await Promise.all(lutPubkeys.map((pk) => connection.getAddressLookupTable(pk)))
  const lookups: AddressLookupTableAccount[] = lookupFetches
    .map((r) => r.value)
    .filter((v): v is AddressLookupTableAccount => !!v)

  // Add ComputeBudget (price optional)
  const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 })
  const computePriceIx = microLamports > 0 ? ComputeBudgetProgram.setComputeUnitPrice({ microLamports }) : null
  const front = [computeLimitIx, ...(computePriceIx ? [computePriceIx] : [])]

  const { blockhash } = await connection.getLatestBlockhash()

  // 4) simulate and adjust CU
  let message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [...front, ...ixs],
  }).compileToV0Message(lookups)
  let tx = new VersionedTransaction(message)

  const sim = await connection.simulateTransaction(tx, { sigVerify: false })
  if (sim.value.err) {
    return { reason: `simulation-error: ${JSON.stringify(sim.value.err)}` }
  }

  const consumed = sim.value.unitsConsumed ?? 0
  const target = Math.min(Math.floor(consumed * computeMargin), 1_400_000)
  const tunedLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: target })

  message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [tunedLimitIx, ...(computePriceIx ? [computePriceIx] : []), ...ixs],
  }).compileToV0Message(lookups)
  tx = new VersionedTransaction(message)

  // re-simulate after tuning
  const sim2 = await connection.simulateTransaction(tx, { sigVerify: false })
  if (sim2.value.err) {
    return { reason: `post-tune-sim-error: ${JSON.stringify(sim2.value.err)}` }
  }

  return { tx, usedIndices: picked.map((p) => p.idx) }
}
