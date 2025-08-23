import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { AppText } from '@/components/app-text'
import { ellipsify } from '@/utils/ellipsify'
import { AppView } from '@/components/app-view'
import { AppPage } from '@/components/app-page'
import { AccountUiButtons } from './account-ui-buttons'
import { AccountUiBalance } from '@/components/account/account-ui-balance'
import { AccountUiTokenAccounts } from '@/components/account/account-ui-token-accounts'
import { RefreshControl, ScrollView, Alert, View } from 'react-native'
import { useCallback, useState } from 'react'
import { useGetBalanceInvalidate } from '@/components/account/use-get-balance'
import { PublicKey } from '@solana/web3.js'
import { useGetTokenAccountsInvalidate } from '@/components/account/use-get-token-accounts'
import { WalletUiButtonConnect } from '@/components/solana/wallet-ui-button-connect'
import { BaseButton } from '@/components/solana/base-button'
import { useBurnTokens } from '@/hooks/use-burn-tokens'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type SelectItem = { mint: string; tokenAccount?: string }

export function AccountFeature() {
  const { account } = useWalletUi()
  const [refreshing, setRefreshing] = useState(false)

  const invalidateBalance = useGetBalanceInvalidate({ address: account?.publicKey as PublicKey })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: account?.publicKey as PublicKey })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([invalidateBalance(), invalidateTokenAccounts()])
    setRefreshing(false)
  }, [invalidateBalance, invalidateTokenAccounts])

  // Selection state for tokens
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

  const onBurnSelectedTokens = useCallback(() => {
    if (!selected.length || !account?.publicKey) return
    Alert.alert(
      'Confirm burn',
      `Burn ${selected.length} token account(s)? Entire balances will be burned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Burn',
          style: 'destructive',
          onPress: async () => {
            setBurnBusy(true)
            try {
              await burnTokens(
                selected.map(({ mint, tokenAccount }) => ({
                  mint: new PublicKey(mint),
                  // if we have the exact token account, pass it; otherwise hook resolves ATA
                  tokenAccount: tokenAccount ? new PublicKey(tokenAccount) : undefined,
                  amountBase: 'ALL' as const,
                })),
              )
              setSelected([])
              await Promise.all([invalidateBalance(), invalidateTokenAccounts()])
            } finally {
              setBurnBusy(false)
            }
          },
        },
      ],
    )
  }, [selected, account?.publicKey, burnTokens, invalidateBalance, invalidateTokenAccounts])

  return (
    <AppPage>
      {account ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh()} />}
            contentContainerStyle={{ paddingBottom: (selectedCount > 0 ? 56 + 16 : 0) + insets.bottom }}
          >
            <AppView style={{ alignItems: 'center', gap: 4 }}>
              <AccountUiBalance address={account.publicKey} />
              <AppText style={{ opacity: 0.7 }}>{ellipsify(account.publicKey.toString(), 8)}</AppText>
            </AppView>

            <AppView style={{ marginTop: 8, alignItems: 'center' }}>
              <AccountUiButtons />
            </AppView>

            <AppView style={{ marginTop: 8, alignItems: 'center', gap: 8, width: '100%' }}>
              {/* Token list, selectable */}
              <AccountUiTokenAccounts
                address={account.publicKey}
                selectable
                selected={selected}
                onToggleSelect={toggleSelect}
              />
            </AppView>
          </ScrollView>

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