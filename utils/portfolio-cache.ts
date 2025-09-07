// utils/portfolio-cache.ts
import { useEffect, useSyncExternalStore } from 'react'
import { HELIUS_ENDPOINT } from '@/utils/env'
import { HeliusAsset } from '@/types/helius'
import { parseHeliusTokens } from '@/utils/parse-helius-assets'

export type PortfolioToken = {
  mint: string
  amountUi: number
  amountBaseStr?: string
  decimals: number
  usd: number
  sellable?: boolean
  symbol?: string
  logoURI?: string
  tokenAccount?: string
  name?: string
}

type Snapshot = { tokens: PortfolioToken[]; updatedAt: number }

const store = new Map<string, Snapshot>()
const subs = new Set<() => void>()
const emit = () => subs.forEach((fn) => fn())

// TTL et anti-double fetch
const SNAPSHOT_TTL_MS = 20_000
const inflight = new Map<string, Promise<Snapshot>>()

export function publishPortfolioSnapshot(owner: string, tokens: PortfolioToken[]) {
  store.set(owner, { tokens, updatedAt: Date.now() })
  emit()
}

export function usePortfolioSnapshot(owner?: string): PortfolioToken[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => (owner ? (store.get(owner)?.tokens ?? []) : []),
  )
}

// --- Helpers Helius --------------------------------------------------------

async function fetchHeliusTokens(owner: string): Promise<PortfolioToken[]> {
  const res = await fetch(HELIUS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 1000,
        sortBy: { sortBy: 'id', sortDirection: 'asc' },
        options: {
          showFungible: true,
          showNativeBalance: true,
          showCollectionMetadata: false,
          showUnverifiedCollections: false,
          showZeroBalance: false,
        },
      },
    }),
  })
  if (!res.ok) throw new Error('Failed to fetch Helius assets')
  const { result }: { result: { items: HeliusAsset[] } } = await res.json()

  const fungibles = result.items.filter((a) => a.interface === 'FungibleToken')
  const parsed = parseHeliusTokens(fungibles)

  const tokens: PortfolioToken[] = parsed.map((t) => {
    const decimals = Number(t.decimals ?? 0)
    const amountBaseStr = decimals > 0 ? t.amount.toFixed(decimals).replace('.', '') : String(Math.floor(t.amount))
    return {
      mint: t.mint,
      amountUi: t.amount,
      amountBaseStr,
      decimals,
      usd: Number(t.usdValue ?? 0),
      symbol: t.symbol || undefined,
      logoURI: t.image || undefined,
      name: t.name || undefined,
      // tokenAccount: (si tu veux enrichir plus tard depuis un autre appel)
    }
  })

  return tokens
}

// --- API bootstrap/refresh --------------------------------------------------

export function hasFreshSnapshot(owner: string): boolean {
  const snap = store.get(owner)
  return !!snap && Date.now() - snap.updatedAt < SNAPSHOT_TTL_MS
}

export async function ensurePortfolio(owner: string, opts: { force?: boolean } = {}): Promise<Snapshot> {
  const force = !!opts.force
  const snap = store.get(owner)
  if (!force && snap && Date.now() - snap.updatedAt < SNAPSHOT_TTL_MS) {
    return snap
  }

  const running = inflight.get(owner)
  if (running) return running

  const p = (async () => {
    const tokens = await fetchHeliusTokens(owner)
    const next: Snapshot = { tokens, updatedAt: Date.now() }
    store.set(owner, next)
    emit()
    return next
  })().finally(() => inflight.delete(owner))

  inflight.set(owner, p)
  return p
}

export async function refreshPortfolio(owner: string): Promise<Snapshot> {
  return ensurePortfolio(owner, { force: true })
}

export function useEnsurePortfolio(owner?: string) {
  useEffect(() => {
    if (owner) void ensurePortfolio(owner)
  }, [owner])
}
