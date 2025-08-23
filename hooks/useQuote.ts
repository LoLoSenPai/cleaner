import { useEffect, useState } from 'react'
import { QuoteResponse } from '@/types/jupiter'

const JUP_LITE_QUOTE_URL = 'https://lite-api.jup.ag/swap/v1/quote'

export function useQuote(
  inputMint: string | undefined,
  outputMint: string | undefined,
  amount: string | undefined,
  inputDecimals: number | undefined,
) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount || isNaN(Number(amount)) || inputDecimals == null) {
        setQuote(null)
        return
      }

      const uiAmount = Number(amount)
      const baseAmount = Math.floor(uiAmount * 10 ** inputDecimals) // int
      const url =
        `${JUP_LITE_QUOTE_URL}` +
        `?inputMint=${encodeURIComponent(inputMint)}` +
        `&outputMint=${encodeURIComponent(outputMint)}` +
        `&amount=${baseAmount}` +
        `&slippage=1`

      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } })
        const text = await res.text()

        // Try JSON; if it fails, keep raw text as { error }
        let json: any
        try {
          json = JSON.parse(text)
        } catch {
          json = { error: text } // e.g. "Rate limited"
        }

        if (!cancelled) setQuote(json)
      } catch (err) {
        if (!cancelled) setQuote({ error: String(err) } as any)
      }
    }

    fetchQuote()
    return () => {
      cancelled = true
    }
  }, [inputMint, outputMint, amount, inputDecimals])

  return quote
}
