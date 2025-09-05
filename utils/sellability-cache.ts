// utils/sellability-cache.ts
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const LITE = 'https://lite-api.jup.ag/swap/v1/quote'

export type Sellability = 'sellable' | 'notsellable' | 'unknown'

type Entry = { status: Sellability; expiresAt: number }
const CACHE = new Map<string, Entry>()
const INFLIGHT = new Map<string, Promise<Sellability>>()
const TTL_MS = 60 * 60 * 1000 // 1h

export async function getSellability(mint: string, decimals = 0, testAmountUi = 1): Promise<Sellability> {
  const now = Date.now()
  const hit = CACHE.get(mint)
  if (hit && hit.expiresAt > now) return hit.status

  let p = INFLIGHT.get(mint)
  if (!p) {
    p = (async () => {
      try {
        const ui = Math.max(1e-9, Number.isFinite(testAmountUi) ? testAmountUi : 1)
        const baseAmount = Math.max(1, Math.floor(ui * 10 ** Math.min(decimals || 0, 9)))
        const url = `${LITE}?inputMint=${mint}&outputMint=${SOL_MINT}&amount=${baseAmount}&slippage=1`
        const res = await fetch(url, { headers: { accept: 'application/json' } })
        const txt = await res.text()
        let json: any
        try {
          json = JSON.parse(txt)
        } catch {
          json = null
        }

        const routePlan = Array.isArray(json?.routePlan) ? json.routePlan : []
        const routes = Array.isArray(json?.routes) ? json.routes : []
        const status: Sellability = routePlan.length || routes.length ? 'sellable' : 'notsellable'

        CACHE.set(mint, { status, expiresAt: now + TTL_MS })
        return status
      } catch {
        return 'unknown'
      } finally {
        INFLIGHT.delete(mint)
      }
    })()
    INFLIGHT.set(mint, p)
  }
  return await p
}
