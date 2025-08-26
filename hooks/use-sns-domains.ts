// hooks/use-sns.ts
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

const BASE = 'https://sns-api.bonfida.com'

export function useSnsDomains(owner?: PublicKey | null) {
  return useQuery({
    enabled: !!owner,
    queryKey: ['sns-domains', owner?.toBase58()],
    queryFn: async () => {
      const key = owner!.toBase58()

      // 1) complete list
      const allRes = await fetch(`${BASE}/owners/${key}/domains`)
      const allJson = await allRes.json().catch(() => ({}))
      const all: string[] = allJson?.result ?? []

      // 2) primary (favorite)
      const favRes = await fetch(`${BASE}/v2/user/fav-domains/${key}`)
      const favJson = await favRes.json().catch(() => ({}))
      const primary: string | undefined = favJson?.[key] ?? undefined

      // put the primary in front if present
      const ordered = primary ? [primary, ...all.filter((d) => d !== primary)] : all

      return { primary, domains: ordered }
    },
  })
}
