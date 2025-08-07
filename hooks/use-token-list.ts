// src/hooks/use-token-list.ts
import { useEffect, useState } from 'react'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from '@/components/solana/solana-provider'
import { TokenInfo } from '@/types/tokens'

const IMPORTANT_TOKENS = [
    'SOL', 'USDC', 'USDT', 'JUP', 'JLP', 'wBTC', 'ETH',
    'mSOL', 'bSOL', 'stSOL', 'RAY'
]

export function useTokenList(): TokenInfo[] {
    const [tokens, setTokens] = useState<TokenInfo[]>([])
    const { account } = useWalletUi()
    const connection = useConnection()

    useEffect(() => {
        if (!account?.address) return

        const fetchTokens = async () => {
            try {
                const res = await fetch('https://token.jup.ag/strict')
                const json = await res.json()
                const rawTokens = json as TokenInfo[];

                const tokenArray = rawTokens.filter((t) =>
                    IMPORTANT_TOKENS.includes(t.symbol)
                )

                const enriched = await Promise.all(
                    tokenArray.map(async (token) => {
                        try {
                            const ata = getAssociatedTokenAddressSync(
                                new PublicKey(token.address),
                                new PublicKey(account.address)
                            )
                            const accountInfo = await getAccount(connection, ata)
                            const amount = Number(accountInfo.amount) / 10 ** token.decimals
                            return { ...token, amount }
                        } catch {
                            return { ...token, amount: 0 }
                        }
                    })
                )

                const filtered = enriched.filter(
                    (t) => t.amount && t.amount > 0 || IMPORTANT_TOKENS.includes(t.symbol)
                )

                setTokens(filtered)
            } catch (err) {
                console.error('Failed to fetch token list', err)
                setTokens([])
            }
        }

        fetchTokens()
    }, [account?.address])

    return tokens
}
