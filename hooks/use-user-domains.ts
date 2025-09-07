import { useConnection } from '@/components/solana/solana-provider'
import { TldParser } from '@onsol/tldparser'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

const BONFIDA_BASE = 'https://sns-api.bonfida.com'

type DomainItem = { name: string; tld: 'skr' | 'saga' | 'sol'; primary?: boolean }
export type UserDomains = {
  skr: string[]
  saga: string[]
  solPrimary?: string
  ordered: DomainItem[]
}

function splitAllDomains(list: string[]) {
  const skr: string[] = []
  const saga: string[] = []
  for (const d of list) {
    if (d.endsWith('.skr')) skr.push(d.slice(0, -4))
    else if (d.endsWith('.saga')) saga.push(d.slice(0, -5))
  }
  return { skr, saga }
}

async function getSolPrimary(owner: PublicKey) {
  const key = owner.toBase58()
  const res = await fetch(`${BONFIDA_BASE}/v2/user/fav-domains/${key}`)
  const json = await res.json().catch(() => ({}))
  return json?.[key] as string | undefined
}

export function useUserDomains(owner?: PublicKey | null) {
  const connection = useConnection()

  return useQuery<UserDomains>({
    enabled: !!owner,
    queryKey: ['user-domains', connection.rpcEndpoint, owner?.toBase58()],
    queryFn: async () => {
      const parser = new TldParser(connection)

      // 1) AllDomains: pull all user domains (may include .saga, later .skr)
      const raw = (await parser.getAllUserDomains(owner as PublicKey)) as any[]
      const all: string[] = (raw || [])
        .map((it: any) => {
          if (typeof it === 'string') return it
          if (it?.name && typeof it.name === 'string') return it.name
          if (it?.domain && typeof it.domain === 'string') return it.domain
          if (it?.toBase58) return it.toBase58()
          return null
        })
        .filter(Boolean) as string[]

      const { skr, saga } = splitAllDomains(all)

      // 2) SNS: fetch only the primary .sol (fast)
      const solPrimary = await getSolPrimary(owner as PublicKey)

      // Order: .skr → .saga → primary .sol
      const ordered: DomainItem[] = [
        ...skr.map((n) => ({ name: n, tld: 'skr' as const })),
        ...saga.map((n) => ({ name: n, tld: 'saga' as const })),
        ...(solPrimary ? [{ name: solPrimary, tld: 'sol' as const, primary: true }] : []),
      ]

      return { skr, saga, solPrimary, ordered }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: 0,
    retry: 0,
  })
}
