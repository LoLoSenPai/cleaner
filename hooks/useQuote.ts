import { useEffect, useState } from 'react'
import { SwapInfo, RouteStep, QuoteResponse } from '@/types/jupiter'

const JUP_LITE_QUOTE_URL = 'https://lite-api.jup.ag/swap/v1/quote'

export function useQuote(
    inputMint: string | undefined,
    outputMint: string | undefined,
    amount: string | undefined,
    inputDecimals: number | undefined
) {
    const [quote, setQuote] = useState<QuoteResponse | null>(null)

    useEffect(() => {
        const fetchQuote = async () => {
            if (!inputMint || !outputMint || !amount || isNaN(Number(amount)) || inputDecimals == null) {
                setQuote(null)
                return
            }

            const uiAmount = parseFloat(amount)
            const baseAmount = Math.floor(uiAmount * 10 ** inputDecimals)

            const url = `${JUP_LITE_QUOTE_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${baseAmount}&slippage=1`

            try {
                const res = await fetch(url)
                const json = await res.json()
                setQuote(json)
            } catch (err) {
                console.error('Quote error:', err)
                setQuote(null)
            }
        }

        fetchQuote()
    }, [inputMint, outputMint, amount, inputDecimals])

    return quote
}
