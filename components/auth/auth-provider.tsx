// components/auth/auth-provider.tsx
import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { AppConfig } from '@/constants/app-config'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol'
import { createContext, PropsWithChildren, use, useCallback, useMemo, useState } from 'react'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => Promise<Account>
  signOut: () => Promise<void>
}

const Context = createContext<AuthState>({} as AuthState)

export function useAuth() {
  const value = use(Context)
  if (!value) throw new Error('useAuth must be wrapped in a <AuthProvider />')
  return value
}

export function AuthProvider({ children }: PropsWithChildren) {
  const {
    accounts,
    authToken,
    isLoading: authLoading,
    authorizeSessionWithSignIn,
    deauthorizeSession,
    deauthorizeSessions,
  } = useAuthorization()

  const [sessionAccount, setSessionAccount] = useState<Account | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = useCallback(async (): Promise<Account> => {
    setBusy(true)
    try {
      const url = new URL(AppConfig.uri)
      const payload = {
        domain: url.host,
        statement: AppConfig.siws.statement,
        version: '1',
        nonce: `${Date.now()}`,
      }

      const acc = await transact(async (wallet) => {
        if (authToken) {
          try {
            await deauthorizeSession(wallet)
          } catch {
          }
        }
        await deauthorizeSessions()

        return await authorizeSessionWithSignIn(wallet, payload)
      })

      setSessionAccount(acc)
      return acc
    } finally {
      setBusy(false)
    }
  }, [authToken, authorizeSessionWithSignIn, deauthorizeSession, deauthorizeSessions])

  const signOut = useCallback(async () => {
    setSessionAccount(null)
    await deauthorizeSessions()
  }, [deauthorizeSessions])

  const value: AuthState = useMemo(
    () => ({
      signIn,
      signOut,
      isAuthenticated: !!sessionAccount || (accounts?.length ?? 0) > 0,
      isLoading: busy || authLoading,
    }),
    [signIn, signOut, sessionAccount, accounts, busy, authLoading],
  )

  return <Context value={value}>{children}</Context>
}
