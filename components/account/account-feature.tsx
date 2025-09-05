import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { AppPage } from '@/components/app-page'
import { AccountUiButtons } from './account-ui-buttons'
import { AccountUiBalance } from '@/components/account/account-ui-balance'
import { AccountUiTokenAccounts } from '@/components/account/account-ui-token-accounts'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useCallback, useState } from 'react'
import { useGetBalanceInvalidate } from '@/components/account/use-get-balance'
import { PublicKey } from '@solana/web3.js'
import { useGetTokenAccountsInvalidate } from '@/components/account/use-get-token-accounts'
import { WalletUiButtonConnect } from '@/components/solana/wallet-ui-button-connect'
import { BaseButton } from '@/components/solana/base-button'
import { useBurnTokens } from '@/hooks/use-burn-tokens'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSnsDomains } from '@/hooks/use-sns-domains'
import ConfirmDialog from '@/components/ui/confirm-dialog';

type SelectItem = { mint: string; tokenAccount?: string }

const CTA_HEIGHT = 56; // height of the floating Burn button

export function AccountFeature() {
  const { account } = useWalletUi()
  const [refreshing, setRefreshing] = useState(false)
  const { data: sns } = useSnsDomains(account?.publicKey)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const invalidateBalance = useGetBalanceInvalidate({ address: account?.publicKey as PublicKey })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: account?.publicKey as PublicKey })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([invalidateBalance(), invalidateTokenAccounts()])
    setRefreshing(false)
  }, [invalidateBalance, invalidateTokenAccounts])

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
      await Promise.all([invalidateBalance(), invalidateTokenAccounts()])
    } finally {
      setBurnBusy(false)
    }
  }, [selected, account?.publicKey, burnTokens, invalidateBalance, invalidateTokenAccounts])

  return (
    <AppPage>
      {account ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh()} />}
            contentContainerStyle={{
              // only leave space when the floating CTA is visible
              paddingBottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0,
            }}
            scrollIndicatorInsets={{
              bottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0,
            }}
            contentInsetAdjustmentBehavior="never"
          >
            <AppView disableBg style={{ alignItems: 'center', gap: 4 }}>
              <AccountUiBalance address={account.publicKey} />

              {sns?.domains?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {sns.domains.map((d, i) => (
                    <View
                      key={d}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: i === 0 ? 'rgba(77,161,255,0.18)' : 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderColor: i === 0 ? 'rgba(77,161,255,0.35)' : 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <AppText style={{ fontSize: 12, color: '#fff' }}>{d}.sol</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </AppView>

            <AppView disableBg style={{ marginTop: 0, alignItems: 'center' }}>
              <AccountUiButtons />
            </AppView>

            <AppView
              disableBg
              style={{ marginTop: 0, alignItems: 'center', gap: 8, width: '100%', paddingBottom: 0 }}
            >
              <AccountUiTokenAccounts
                address={account.publicKey}
                selectable
                selected={selected}
                onToggleSelect={toggleSelect}
              />
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
