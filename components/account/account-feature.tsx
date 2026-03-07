// components/account/account-feature.tsx
import { AccountUiBalance } from '@/components/account/account-ui-balance'
import { AccountUiTokenAccounts } from '@/components/account/account-ui-token-accounts'
import { useGetBalanceInvalidate } from '@/components/account/use-get-balance'
import { useGetTokenAccountsInvalidate } from '@/components/account/use-get-token-accounts'
import { AppPage } from '@/components/app-page'
import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { BaseButton } from '@/components/solana/base-button'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { WalletUiButtonConnect } from '@/components/solana/wallet-ui-button-connect'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { useBurnTokens } from '@/hooks/use-burn-tokens'
import { useUserDomains } from '@/hooks/use-user-domains'
import { refreshPortfolio } from '@/utils/portfolio-cache'
import { PublicKey } from '@solana/web3.js'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AccountUiButtons } from './account-ui-buttons'


type SelectItem = { mint: string; tokenAccount?: string }
const CTA_HEIGHT = 56

export function AccountFeature() {
  const { account } = useWalletUi()
  const owner = account?.publicKey?.toBase58()

  // --- Anti-crash: petite fenêtre de stabilisation après apparition de la pubkey
  const [walletReady, setWalletReady] = useState(false)
  useEffect(() => {
    if (!account?.publicKey) {
      setWalletReady(false)
      return
    }
    const t = setTimeout(() => setWalletReady(true), 400) // 300–400ms suffit
    return () => clearTimeout(t)
  }, [account?.publicKey])

  // --- Clé pour remonter proprement la vue quand le wallet change
  const screenKey = useMemo(() => owner ?? 'no-wallet', [owner])

  // --- Domains: ne démarre qu'une fois le wallet stabilisé
  const { data: dom, isFetching, refetch: refetchDomains } = useUserDomains(account?.publicKey)

  const [refreshing, setRefreshing] = useState(false)
  const invalidateBalance = useGetBalanceInvalidate({ address: account?.publicKey as PublicKey })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: account?.publicKey as PublicKey })

  const onRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await Promise.all([
        owner ? refreshPortfolio(owner) : Promise.resolve(),
        invalidateBalance(),
        invalidateTokenAccounts(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, owner, invalidateBalance, invalidateTokenAccounts])

  // throttle 500ms pour éviter 2 refetchs quand focus + walletReady se déclenchent quasi ensemble
  const lastKickRef = useRef(0)
  const kickDomains = useCallback(() => {
    const now = Date.now()
    if (now - lastKickRef.current < 500) return
    lastKickRef.current = now
    refetchDomains()
  }, [refetchDomains])

  useEffect(() => {
    if (walletReady && owner) kickDomains()
  }, [walletReady, owner, kickDomains])

  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<SelectItem[]>([])
  const selectedCount = selected.length

  const toggleSelect = useCallback((item: SelectItem) => {
    setSelected(prev => {
      const i = prev.findIndex(p => p.mint === item.mint && p.tokenAccount === item.tokenAccount)
      if (i >= 0) return [...prev.slice(0, i), ...prev.slice(i + 1)]
      return [...prev, item]
    })
  }, [])

  const { mutateAsync: burnTokens } = useBurnTokens()
  const [burnBusy, setBurnBusy] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const onBurnSelectedTokens = useCallback(() => {
    if (!selected.length || !account?.publicKey) return
    setConfirmOpen(true)
  }, [selected.length, account?.publicKey])

  const doBurn = useCallback(async () => {
    if (!selected.length || !account?.publicKey) return
    setConfirmOpen(false)
    setBurnBusy(true)
    try {
      await burnTokens(
        selected.map(({ mint, tokenAccount }) => ({
          mint: new PublicKey(mint),
          tokenAccount: tokenAccount ? new PublicKey(tokenAccount) : undefined,
          amountBase: 'ALL' as const,
        })),
      )
      setSelected([])
      await Promise.all([refreshPortfolio(owner!), invalidateBalance(), invalidateTokenAccounts()])
    } finally {
      setBurnBusy(false)
    }
  }, [selected, account?.publicKey, burnTokens, invalidateBalance, invalidateTokenAccounts, owner])

  return (
    <AppPage>
      {account ? (
        <View key={screenKey} style={{ flex: 1 }}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0 }}
            scrollIndicatorInsets={{ bottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0 }}
            contentInsetAdjustmentBehavior="never"
          >
            <AppView disableBg style={{ alignItems: 'center', gap: 4 }}>
              {/* 👉 Balance et badges : toujours montés */}
              <AccountUiBalance address={account.publicKey} />

              {walletReady && isFetching && !dom?.ordered?.length && (
                <AppText style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                  Resolving domains…
                </AppText>
              )}

              {!!dom?.ordered?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  {dom.ordered.map((d) => {
                    const label = `${d.name}.${d.tld}`
                    const isSkr = d.tld === 'skr'
                    const isSaga = d.tld === 'saga'
                    const isPrimarySol = d.tld === 'sol' && d.primary

                    const bg = isSkr
                      ? 'rgba(114,255,172,0.16)'
                      : isSaga
                        ? 'rgba(202,148,255,0.16)'
                        : isPrimarySol
                          ? 'rgba(77,161,255,0.18)'
                          : 'rgba(255,255,255,0.08)'

                    const bd = isSkr
                      ? 'rgba(114,255,172,0.35)'
                      : isSaga
                        ? 'rgba(202,148,255,0.35)'
                        : isPrimarySol
                          ? 'rgba(77,161,255,0.35)'
                          : 'rgba(255,255,255,0.15)'

                    return (
                      <View
                        key={`${d.tld}:${d.name}`}
                        style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, backgroundColor: bg, borderColor: bd }}
                      >
                        <AppText style={{ fontSize: 12, color: '#fff' }}>{label}</AppText>
                      </View>
                    )
                  })}
                </View>
              )}
            </AppView>

            <AppView disableBg style={{ marginTop: 0, alignItems: 'center' }}>
              <AccountUiButtons />
            </AppView>

            <AppView disableBg style={{ marginTop: 0, alignItems: 'center', gap: 8, width: '100%', paddingBottom: 0 }}>
              {/* 👉 On ne monte la liste lourde qu’une fois le wallet stabilisé */}
              {walletReady && (
                <AccountUiTokenAccounts
                  address={account.publicKey}
                  selectable
                  selected={selected}
                  onToggleSelect={toggleSelect}
                />
              )}
            </AppView>
          </ScrollView>

          <ConfirmDialog
            visible={confirmOpen}
            title="Confirm burn"
            message={`Burn ${selected.length} token account(s)? Entire balances will be burned.`}
            cancelText="Cancel"
            confirmText="Burn"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={doBurn}
          />

          {selectedCount > 0 && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16 + insets.bottom,
                alignItems: 'center',
              }}
            >
              <BaseButton
                variant="gradient"
                size="lg"
                fullWidth
                iconName="flame.fill"
                label={burnBusy ? 'Burning…' : `Burn selected tokens (${selectedCount})`}
                disabled={burnBusy}
                onPress={onBurnSelectedTokens}
              />
            </View>
          )}
        </View>
      ) : (
        <AppView style={{ flexDirection: 'column', justifyContent: 'flex-end' }}>
          <AppText>Connect your wallet.</AppText>
          <WalletUiButtonConnect />
        </AppView>
      )}
    </AppPage>
  )
}
