// components/solana/use-authorization.tsx
import { useCluster } from '@/components/cluster/cluster-provider'
import { AppConfig } from '@/constants/app-config'
import { ellipsify } from '@/utils/ellipsify'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AppIdentity,
  AuthorizationResult,
  AuthorizeAPI,
  Account as AuthorizedAccount,
  AuthToken,
  Base64EncodedAddress,
  DeauthorizeAPI,
  SignInPayload,
} from '@solana-mobile/mobile-wallet-adapter-protocol'
import { PublicKey, PublicKeyInitData } from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WalletIcon } from '@wallet-standard/core'
import { toUint8Array } from 'js-base64'
import { useCallback, useMemo } from 'react'

const identity: AppIdentity = {
  name: AppConfig.name,
  uri: AppConfig.uri,
  icon: AppConfig.icon,
}

export type Account = Readonly<{
  address: Base64EncodedAddress
  displayAddress?: string
  icon?: WalletIcon
  label?: string
  publicKey: PublicKey
}>

type WalletAuthorization = Readonly<{
  accounts: Account[]
  authToken: AuthToken
  selectedAccount: Account
}>

function getPublicKeyFromAddress(address: Base64EncodedAddress): PublicKey {
  return new PublicKey(toUint8Array(address))
}

function getAccountFromAuthorizedAccount(account: AuthorizedAccount): Account {
  const publicKey = getPublicKeyFromAddress(account.address)
  return {
    address: account.address,
    // some wallets expose display_address (non-typed)
    displayAddress: (account as unknown as { display_address?: string })?.display_address,
    icon: account.icon,
    label: account.label ?? ellipsify(publicKey.toString(), 8),
    publicKey,
  }
}

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account,
): WalletAuthorization {
  let selectedAccount: Account
  if (
    previouslySelectedAccount == null ||
    !authorizationResult.accounts.some(({ address }) => address === previouslySelectedAccount.address)
  ) {
    selectedAccount = getAccountFromAuthorizedAccount(authorizationResult.accounts[0])
  } else {
    selectedAccount = previouslySelectedAccount
  }
  return {
    accounts: authorizationResult.accounts.map(getAccountFromAuthorizedAccount),
    authToken: authorizationResult.auth_token,
    selectedAccount,
  }
}

/** Reviver to restore PublicKeys when parsing JSON */
function cacheReviver(key: string, value: any) {
  if (key === 'publicKey') {
    return new PublicKey(value as PublicKeyInitData)
  }
  return value
}

const AUTHORIZATION_STORAGE_KEY = 'authorization-cache'
const queryKey = ['wallet-authorization']

function usePersistAuthorization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (auth: WalletAuthorization | null) => {
      try {
        await AsyncStorage.setItem(AUTHORIZATION_STORAGE_KEY, JSON.stringify(auth))
      } catch {
        // do not crash in production
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })
}

function useFetchAuthorization() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<WalletAuthorization | null> => {
      try {
        const raw = await AsyncStorage.getItem(AUTHORIZATION_STORAGE_KEY)
        if (!raw) return null

        // ⚠️ use the reviver to reconstitute all PublicKeys
        const parsed = JSON.parse(raw, cacheReviver) as WalletAuthorization

        // Minimal validation
        if (!parsed?.selectedAccount?.address || !parsed?.authToken) return null
        return parsed
      } catch {
        return null
      }
    },
  })
}

function useInvalidateAuthorizations() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey })
}

export function useAuthorization() {
  const { selectedCluster } = useCluster()
  const fetchQuery = useFetchAuthorization()
  const invalidateAuthorizations = useInvalidateAuthorizations()
  const persistMutation = usePersistAuthorization()

  const handleAuthorizationResult = useCallback(
    async (authorizationResult: AuthorizationResult): Promise<WalletAuthorization> => {
      const next = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        fetchQuery.data?.selectedAccount,
      )
      await persistMutation.mutateAsync(next)
      return next
    },
    [fetchQuery.data?.selectedAccount, persistMutation],
  )

  /** Authorize the session */
  const authorizeSession = useCallback(
    async (wallet: AuthorizeAPI) => {
      const authorizationResult = await wallet.authorize({
        identity,
        chain: selectedCluster.id,
        auth_token: fetchQuery.data?.authToken,
      })
      return (await handleAuthorizationResult(authorizationResult)).selectedAccount
    },
    [fetchQuery.data?.authToken, handleAuthorizationResult, selectedCluster.id],
  )

  /** SIWS (Sign-In With Solana) — combine authorize + sign message */
  const authorizeSessionWithSignIn = useCallback(
    async (wallet: AuthorizeAPI, signInPayload: SignInPayload) => {
      const authorizationResult = await wallet.authorize({
        identity,
        chain: selectedCluster.id,
        auth_token: fetchQuery.data?.authToken,
        sign_in_payload: signInPayload,
      })
      return (await handleAuthorizationResult(authorizationResult)).selectedAccount
    },
    [fetchQuery.data?.authToken, handleAuthorizationResult, selectedCluster.id],
  )

  /** Deauthorize the current session (invalidates the token on the wallet side) */
  const deauthorizeSession = useCallback(
    async (wallet: DeauthorizeAPI) => {
      if (!fetchQuery.data?.authToken) return
      await wallet.deauthorize({ auth_token: fetchQuery.data.authToken })
      await persistMutation.mutateAsync(null)
    },
    [fetchQuery.data?.authToken, persistMutation],
  )

  /** “Disconnect” UI — clean local cache + invalidate the query */
  const deauthorizeSessions = useCallback(async () => {
    await invalidateAuthorizations()
    await persistMutation.mutateAsync(null)
  }, [invalidateAuthorizations, persistMutation])

  return useMemo(
    () => ({
      accounts: fetchQuery.data?.accounts ?? null,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      deauthorizeSessions,
      isLoading: fetchQuery.isLoading,
      selectedAccount: fetchQuery.data?.selectedAccount ?? null,
    }),
    [
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      deauthorizeSessions,
      fetchQuery.data?.accounts,
      fetchQuery.data?.selectedAccount,
      fetchQuery.isLoading,
    ],
  )
}
