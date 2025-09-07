// hooks/use-helius-assets.ts
import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { HELIUS_ENDPOINT } from '@/utils/env'
import { HeliusAsset } from '@/types/helius'
import { useConnection } from '@/components/solana/solana-provider'
import { resolveNftMeta, pickImageFromHeliusAsset, type ResolvedNftMeta } from '@/utils/resolve-nft-meta'

export function useHeliusAssets(owner: PublicKey) {
  const connection = useConnection()

  return useQuery({
    queryKey: ['helius-assets', owner.toBase58()],
    queryFn: async () => {
      const res = await fetch(HELIUS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: owner.toBase58(),
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
      const items = result.items

      const tokens = items.filter((a) => a.interface === 'FungibleToken')
      const nftsRaw = items.filter((a) => a.interface !== 'FungibleToken')

      // Enrich: image/name/symbol best-effort (SGT + edge collections)
      const nfts = await Promise.all(
        nftsRaw.map(async (a) => {
          const hasImg = !!pickImageFromHeliusAsset(a) || !!a?.content?.links?.image
          const hasName = !!a?.content?.metadata?.name
          const hasSymbol = !!a?.content?.metadata?.symbol

          if (hasImg && hasName && hasSymbol) return a

          let meta: ResolvedNftMeta = {}
          try {
            meta = await resolveNftMeta(connection, a)
          } catch {
            // keep meta as {}
          }

          const image = meta.image ?? a?.content?.links?.image
          const name = meta.name ?? a?.content?.metadata?.name
          const symbol = meta.symbol ?? a?.content?.metadata?.symbol
          const jsonUri = meta.jsonUri ?? a?.content?.json_uri

          if (image || name || symbol || jsonUri) {
            return {
              ...a,
              content: {
                ...(a.content ?? {}),
                json_uri: jsonUri,
                metadata: {
                  ...(a.content?.metadata ?? {}),
                  ...(name ? { name } : {}),
                  ...(symbol ? { symbol } : {}),
                },
                links: {
                  ...(a.content?.links ?? {}),
                  ...(image ? { image } : {}),
                },
              },
            } as HeliusAsset
          }
          return a
        }),
      )

      return { tokens, nfts }
    },
    staleTime: 5000,
    refetchOnWindowFocus: false,
  })
}
