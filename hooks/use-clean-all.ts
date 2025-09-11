// hooks/use-clean-all.ts
import { useGetBalanceInvalidate } from '@/components/account/use-get-balance'
import { useGetTokenAccountsInvalidate } from '@/components/account/use-get-token-accounts'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useCloseEmptyAccounts } from '@/hooks/use-close-empty-accounts'
import { useDustSwap } from '@/hooks/use-dust-swap'
import { refreshPortfolio } from '@/utils/portfolio-cache'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useState } from 'react'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Step = 'idle' | 'swap' | 'close' | 'done' | 'error'
export function useCleanAll(owner: PublicKey | undefined) {
  const { account } = useWalletUi()
  const { swapAllBelowUsdFresh } = useDustSwap() // use the “fresh” variant
  const { run: closeRun } = useCloseEmptyAccounts(owner)

  const invalidateSol = useGetBalanceInvalidate({ address: owner! })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: owner! })

  const [step, setStep] = useState<Step>('idle')
  const [log, setLog] = useState('')

  const run = useCallback(
    async (opts: { doSwap: boolean; doClose: boolean; threshold: number }) => {
      setLog('')
      setStep('idle')
      try {
        // 1) SWAP
        if (opts.doSwap) {
          setStep('swap')
          setLog(`Swapping dust < $${opts.threshold}...`)
          const didSwap = await swapAllBelowUsdFresh(opts.threshold)
          if (didSwap) {
            await invalidateTokenAccounts()
            // give the RPC/indexer a breath so new empty ATAs are visible
            await sleep(500)
          }
        }

        // 2) CLOSE
        if (opts.doClose) {
          setStep('close')
          setLog('Closing empty accounts...')
          await closeRun()
        }

        // 3) Refresh portfolio + SOL
        if (account?.publicKey) {
          await refreshPortfolio(account.publicKey.toBase58()).catch(() => {})
        }
        await invalidateSol()

        setStep('done')
        setLog('All cleaned ✔')
      } catch (e: any) {
        setStep('error')
        setLog(String(e?.message ?? e))
      }
    },
    [swapAllBelowUsdFresh, invalidateTokenAccounts, closeRun, account?.publicKey, invalidateSol],
  )

  const reset = () => {
    setStep('idle')
    setLog('')
  }
  return { run, step, log, reset }
}
