// utils/portfolio-cache.ts
import { useSyncExternalStore } from 'react'

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
}

type Snapshot = { tokens: PortfolioToken[]; updatedAt: number }

const store = new Map<string, Snapshot>()
const subs = new Set<() => void>()
const emit = () => subs.forEach((fn) => fn())

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
