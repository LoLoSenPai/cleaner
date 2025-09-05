// hooks/use-dust-swap.ts
import { useCallback, useEffect, useState } from 'react'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { VersionedTransaction } from '@solana/web3.js'
import { usePortfolioSnapshot } from '@/utils/portfolio-cache'
import { useConnection } from '@/components/solana/solana-provider'
import { Buffer } from 'buffer'

const WSOL_MINT = 'So11111111111111111111111111111111111111112'

export type PreviewItem = {
  mint: string
  symbol: string
  amountUi: number
  amountBaseStr: string
  decimals: number
  usdEst: number
  logoURI?: string
}

type Skipped = { mint: string; symbol: string; reason: string }
type RunResult = {
  ok: { mint: string; symbol: string; sig: string }[]
  fail: { mint: string; symbol: string; reason: string }[]
}

// --- helpers ---------------------------------------------------------------

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

const isUserDecline = (e: any) => {
  const code = (e && (e.code ?? e.errorCode)) as number | undefined
  const msg = String(e?.message ?? e).toLowerCase()
  return code === -3 || msg.includes('declined') || msg.includes('rejected') || msg.includes('cancel')
}

const prettyReason = (e: any) => {
  const msg = String(e?.message ?? e)
  if (isUserDecline(e)) return 'sign request declined'
  if (msg.toLowerCase().includes('authorization')) return 'authorization request failed'
  if (msg.toLowerCase().includes('rate') && msg.toLowerCase().includes('limit')) return 'rate-limited'
  return msg
}

// --- hook ------------------------------------------------------------------

export function useDustSwap() {
  const { account } = useWalletUi()
  const connection = useConnection()
  const { signAndSendTransaction } = useMobileWallet()
  const owner = account?.publicKey?.toBase58()
  const portfolio = usePortfolioSnapshot(owner)

  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [skipped, setSkipped] = useState<Skipped[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const refresh = useCallback(
    async (thresholdUsd = 1) => {
      if (!owner) {
        setPreview([])
        setSkipped([])
        return
      }
      setLoading(true)
      try {
        const items = (portfolio ?? [])
          .filter((t) => t.usd > 0 && t.usd < thresholdUsd)
          .map((t) => ({
            mint: t.mint,
            symbol: t.symbol ?? t.mint.slice(0, 4),
            amountUi: t.amountUi,
            amountBaseStr: t.amountBaseStr ?? String(Math.floor(t.amountUi * 10 ** (t.decimals ?? 0))),
            decimals: t.decimals ?? 0,
            usdEst: t.usd,
            logoURI: t.logoURI,
          }))
          .sort((a, b) => a.usdEst - b.usdEst)

        setPreview(items)
        setSkipped([])
      } finally {
        setLoading(false)
      }
    },
    [owner, portfolio],
  )

  useEffect(() => {
    refresh(1)
  }, [refresh])

  const swapAllBelowUsd = useCallback(
    async (thresholdUsd: number): Promise<boolean> => {
      if (!account?.publicKey) return false
      setBusy(true)
      setLastRun(null)

      const run: RunResult = { ok: [], fail: [] }

      try {
        const items = preview.filter((p) => p.usdEst > 0 && p.usdEst < thresholdUsd)
        if (!items.length) return false

        const minContextSlot = await connection.getSlot()

        for (const p of items) {
          try {
            // (1) quote exact (amount en base units)
            const quoteRes = await fetch(
              `https://lite-api.jup.ag/swap/v1/quote?inputMint=${encodeURIComponent(
                p.mint,
              )}&outputMint=${WSOL_MINT}&amount=${encodeURIComponent(p.amountBaseStr)}&slippage=1`,
              { headers: { accept: 'application/json' } },
            )
            const quoteTxt = await quoteRes.text()
            const quoteJson = JSON.parse(quoteTxt)
            if (!quoteJson?.outAmount || Number(quoteJson.outAmount) <= 0) {
              throw new Error('No route / output is zero')
            }

            // (2) build tx
            const swapRes = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                quoteResponse: quoteJson,
                userPublicKey: account.publicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: {
                  priorityLevelWithMaxLamports: { maxLamports: 1_000_000, priorityLevel: 'high' },
                },
              }),
            })
            const swapTxt = await swapRes.text()
            const swapJson = JSON.parse(swapTxt)
            if (!swapJson?.swapTransaction) throw new Error(String(swapJson?.error ?? 'No swapTransaction'))

            const bytes = Buffer.from(swapJson.swapTransaction, 'base64')
            const tx = VersionedTransaction.deserialize(bytes)

            const sig = await signAndSendTransaction(tx, minContextSlot)
            run.ok.push({ mint: p.mint, symbol: p.symbol, sig })

            await delay(150)
          } catch (e: any) {
            const reason = prettyReason(e)
            run.fail.push({ mint: p.mint, symbol: p.symbol, reason })

            if (isUserDecline(e)) break

            await delay(200)
          }
        }

        setLastRun(run)
        await refresh(thresholdUsd)
        return run.ok.length > 0
      } catch (e: any) {
        setError(String(e?.message ?? e))
        return false
      } finally {
        setBusy(false)
      }
    },
    [account?.publicKey, preview, connection, signAndSendTransaction, refresh],
  )

  return {
    preview,
    skipped,
    lastRun,
    loading,
    busy,
    error,
    refresh,
    swapAllBelowUsd,
  }
}
