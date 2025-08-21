import { createContext, type PropsWithChildren, use, useMemo, useState } from 'react'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { AppConfig } from '@/constants/app-config'
import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { useMutation } from '@tanstack/react-query'

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

function useSignInMutation() {
  const { signIn } = useMobileWallet()

  return useMutation({
    mutationFn: async () => {
      const url = new URL(AppConfig.uri)
      return await signIn({
        domain: url.host,
        uri: AppConfig.uri,
        statement: AppConfig.siws.statement,
        version: '1',
        nonce: `${Date.now()}`,
      })
    },
  })
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { disconnect } = useMobileWallet()
  const { accounts, isLoading } = useAuthorization()
  const signInMutation = useSignInMutation()

  const [sessionAccount, setSessionAccount] = useState<Account | null>(null)

  const value: AuthState = useMemo(
    () => ({
      signIn: async () => {
        const acc = await signInMutation.mutateAsync()
        setSessionAccount(acc)
        return acc
      },
      signOut: async () => {
        setSessionAccount(null)
        await disconnect()
      },
      isAuthenticated: !!sessionAccount || (accounts?.length ?? 0) > 0,
      isLoading: signInMutation.isPending || isLoading,
    }),
    [accounts, disconnect, isLoading, sessionAccount, signInMutation],
  )

  return <Context value={value}>{children}</Context>
}