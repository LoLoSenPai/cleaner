//hooks/use-cleaner-summary.ts
import { useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useGetTokenAccounts } from '@/components/account/use-get-token-accounts'
// import { useHeliusAssets } from '@/hooks/use-helius-assets'
// import { parseHeliusNFTs } from '@/utils/parse-helius-assets'

const RENT_RECOVERED_PER_ACCOUNT = 0.00203928

export function useCleanerSummary() {
    const { account } = useWalletUi()
    const address = account?.publicKey as PublicKey | undefined

    // tokens accounts
    const { data: tokenAccounts } = useGetTokenAccounts({ address: address! })

    // NFTs
    // const { data: heliusData } = useHeliusAssets(address!)
    // const allParsed = useMemo(() => parseHeliusNFTs(heliusData?.nfts ?? []), [heliusData])
    // const spamNfts = useMemo(() => allParsed.filter(n => n.isSpam || n.isCompressed === false && n.name?.toLowerCase().includes('airdropped')).length, [allParsed])

    // empty token accounts
    const emptyAccounts = useMemo(() => {
        if (!tokenAccounts || !address) return 0
        return tokenAccounts.filter(acc => {
            const info = acc.account.data.parsed.info
            const amount = info.tokenAmount?.amount || '0'
            const isNative = info.isNative || false
            const owner = info.owner || ''
            return amount === '0' && !isNative && owner === address.toBase58()
        }).length
    }, [tokenAccounts, address])

    // estimate rent
    const estRent = useMemo(() => (emptyAccounts * RENT_RECOVERED_PER_ACCOUNT).toFixed(4), [emptyAccounts])

    // TODO: brancher dust réel (tokens + price). Pour l’instant, placeholder.
    const dustCount = 0
    const dustEst = '0.0000'

    return {
        emptyAccounts,
        estRent,
        dustCount,
        dustEst,
        // spamNfts,
    }
}
