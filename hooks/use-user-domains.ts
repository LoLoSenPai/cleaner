// hooks/use-user-domains.ts
import { useConnection } from '@/components/solana/solana-provider'
import { MainDomain, TldParser, findMainDomain } from '@onsol/tldparser'
import { Connection, PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

type TldTag = 'skr' | 'saga' | 'sol'
type DomainItem = { name: string; tld: TldTag; primary?: boolean }
export type UserDomains = { skr: string[]; saga: string[]; solPrimary?: string; ordered: DomainItem[] }

const BONFIDA_BASE = 'https://sns-api.bonfida.com'
const emptyData: UserDomains = { skr: [], saga: [], solPrimary: undefined, ordered: [] }

const norm = (list: any[], tld: 'skr' | 'saga') =>
  Array.from(
    new Set(
      (list ?? [])
        .map((d) => (typeof d === 'string' ? d : d?.domain || d?.name))
        .filter(Boolean)
        .map((n: string) => (n.endsWith('.' + tld) ? n.slice(0, -(tld.length + 1)) : n)),
    ),
  )

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const withTimeout = async <T>(p: Promise<T>, ms: number, label?: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error((label ?? 'op') + ' timeout')), ms))])

async function getSnsFavSol(owner: PublicKey) {
  try {
    const key = owner.toBase58()
    const res = await withTimeout(fetch(`${BONFIDA_BASE}/v2/user/fav-domains/${key}`), 6000, 'sns-fav')
    const json = await res.json().catch(() => ({}) as any)
    const v = json?.[key] as string | undefined
    if (!v) return undefined
    return v.toLowerCase().endsWith('.sol') ? v : `${v}.sol`
  } catch {
    return undefined
  }
}

// ⬇️ on passe explicitement un Connection (pas parser.connection)
async function getAnsMainDomain(conn: Connection, owner: PublicKey) {
  try {
    const [mainKey] = findMainDomain(owner)
    const main = await withTimeout(MainDomain.fromAccountAddress(conn, mainKey), 6000, 'ans-main')
    const tldRaw = main.tld?.replace(/^\./, '') || ''
    const tld = (tldRaw === 'skr' || tldRaw === 'saga' ? tldRaw : undefined) as 'skr' | 'saga' | undefined
    if (!tld || !main.domain) return undefined
    return { name: main.domain, tld: tld as TldTag }
  } catch {
    return undefined
  }
}

export function useUserDomains(owner?: PublicKey | null) {
  const connection = useConnection()
  const ownerKey = owner?.toBase58()

  return useQuery<UserDomains, Error>({
    enabled: !!ownerKey,
    queryKey: ['user-domains', connection.rpcEndpoint, ownerKey],
    initialData: emptyData,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,

    queryFn: async () => {
      if (!ownerKey) return emptyData
      const ownerPk = new PublicKey(ownerKey)
      const parser = new TldParser(connection)

      // 1) main ANS (skr/saga) via Connection explicite
      const ansMain = await getAnsMainDomain(connection, ownerPk)

      // 2) listes ANS par TLD avec petit retry anti-429
      let skr: string[] = []
      try {
        const r1 = await withTimeout(parser.getParsedAllUserDomainsFromTld(ownerPk, 'skr'), 8000, 'skr-parsed')
        skr = norm(r1 as any[], 'skr')
      } catch {
        await wait(600)
        try {
          const r2 = await withTimeout(parser.getParsedAllUserDomainsFromTld(ownerPk, 'skr'), 8000, 'skr-parsed-2')
          skr = norm(r2 as any[], 'skr')
        } catch {}
      }

      let saga: string[] = []
      try {
        const r1 = await withTimeout(parser.getParsedAllUserDomainsFromTld(ownerPk, 'saga'), 8000, 'saga-parsed')
        saga = norm(r1 as any[], 'saga')
      } catch {
        await wait(600)
        try {
          const r2 = await withTimeout(parser.getParsedAllUserDomainsFromTld(ownerPk, 'saga'), 8000, 'saga-parsed-2')
          saga = norm(r2 as any[], 'saga')
        } catch {}
      }

      // 3) SNS fav (.sol)
      const solPrimaryFull = await getSnsFavSol(ownerPk)

      // 4) ordered (main ANS d’abord, puis autres, puis .sol)
      const ordered: DomainItem[] = []
      if (ansMain?.name && (ansMain.tld === 'skr' || ansMain.tld === 'saga')) {
        ordered.push({ name: ansMain.name, tld: ansMain.tld, primary: true })
      }
      const isMain = (tld: TldTag, name: string) => ansMain && ansMain.tld === tld && ansMain.name === name
      ordered.push(...skr.filter((n) => !isMain('skr', n)).map((n) => ({ name: n, tld: 'skr' as const })))
      ordered.push(...saga.filter((n) => !isMain('saga', n)).map((n) => ({ name: n, tld: 'saga' as const })))

      // ✅ marquer le .sol (SNS fav) aussi comme primary
      if (solPrimaryFull) {
        const base = solPrimaryFull.replace(/\.sol$/i, '')
        ordered.push({ name: base, tld: 'sol', primary: true })
      }

      return { skr, saga, solPrimary: solPrimaryFull, ordered }
    },
  })
}
