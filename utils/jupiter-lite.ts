// utils/jupiter-lite.ts
import { VersionedTransaction } from '@solana/web3.js'
import { Buffer } from 'buffer'

const JUP_LITE = 'https://lite-api.jup.ag'
const JUP_PRICE = 'https://price.jup.ag/v6/price'
const WSOL_MINT = 'So11111111111111111111111111111111111111112'

export type JupPriceMap = Record<string, { id: string; price: number }>

export async function fetchJupPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {}
  const url = `${JUP_PRICE}?ids=${mints.join(',')}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) return {}
  const json = (await res.json()) as { data: JupPriceMap }
  const map: Record<string, number> = {}
  for (const k of Object.keys(json.data || {})) {
    const p = json.data[k]?.price
    if (typeof p === 'number' && p > 0) map[k] = p
  }
  return map
}

export type LiteQuote = {
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: number
  slippageBps: number
  routePlan: unknown[]
  contextSlot?: number
  timeTaken?: number
}

export async function fetchLiteQuote(params: {
  inputMint: string
  outputMint?: string
  amountBaseUnits: string
  slippage?: number // <-- au lieu de slippageBps
}): Promise<LiteQuote | null> {
  const { inputMint, outputMint = WSOL_MINT, amountBaseUnits, slippage = 1 } = params

  const url =
    `${JUP_LITE}/swap/v1/quote` +
    `?inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${encodeURIComponent(amountBaseUnits)}` +
    `&slippage=${encodeURIComponent(String(slippage))}`

  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  const json = await res.json()
  if ((json as any)?.error) return null
  return json as LiteQuote
}

export async function buildLiteSwapTx(params: {
  userPublicKey: string
  quote: LiteQuote
  wrapAndUnwrapSol?: boolean
}): Promise<VersionedTransaction[] | null> {
  const body = {
    quoteResponse: params.quote,
    userPublicKey: params.userPublicKey,
    wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
    dynamicComputeUnitLimit: true,
    // useSharedAccounts: true, // optional
  }

  const res = await fetch(`${JUP_LITE}/swap/v1/swap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    swapTransaction?: string
    setupTransaction?: string
    cleanupTransaction?: string
  }

  const txs: VersionedTransaction[] = []
  for (const key of ['setupTransaction', 'swapTransaction', 'cleanupTransaction'] as const) {
    const b64 = json[key]
    if (b64) {
      const buf = Buffer.from(b64, 'base64')
      txs.push(VersionedTransaction.deserialize(buf))
    }
  }
  return txs.length ? txs : null
}

export const LITE = {
  WSOL_MINT,
  fetchJupPrices,
  fetchLiteQuote,
  buildLiteSwapTx,
}
