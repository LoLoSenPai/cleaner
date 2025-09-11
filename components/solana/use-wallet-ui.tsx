// hooks/use-wallet-ui.ts
import { useAuthorization } from '@/components/solana/use-authorization'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { useCallback } from 'react'

export type SendTxOpts = {
  skipPreflight?: boolean
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
  maxRetries?: number
}

export function useWalletUi() {
  const { connect, signAndSendTransaction: _signAndSend, signMessage, signIn } = useMobileWallet()
  const { selectedAccount, deauthorizeSessions } = useAuthorization()

  const signAndSendTransaction = useCallback(
    async (tx: any, minContextSlot?: number, opts?: SendTxOpts) => {
      const mergedOpts = { skipPreflight: true, ...(opts ?? {}) }
      try {
        return await (_signAndSend as any)(tx, minContextSlot, mergedOpts)
      } catch {
        return await (_signAndSend as any)(tx, minContextSlot)
      }
    },
    [_signAndSend],
  )

  return {
    account: selectedAccount,
    connect,
    disconnect: deauthorizeSessions,
    signAndSendTransaction,
    signIn,
    signMessage,
  }
}
