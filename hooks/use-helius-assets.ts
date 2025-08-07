import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { HELIUS_ENDPOINT } from '@/utils/env'
import { HeliusAsset } from '@/types/helius'

export function useHeliusAssets(owner: PublicKey) {
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

            const tokens = result.items.filter(
                (asset: HeliusAsset) => asset.interface === 'FungibleToken'
            )
            const nfts = result.items.filter(
                (asset: HeliusAsset) => asset.interface !== 'FungibleToken'
            )

            return { tokens, nfts }
        },
    })
}
