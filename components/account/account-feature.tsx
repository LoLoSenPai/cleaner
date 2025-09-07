//components/account/account-feature.tsx
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
import { useUserDomains } from '@/hooks/use-user-domains'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { refreshPortfolio } from '@/utils/portfolio-cache'

type SelectItem = { mint: string; tokenAccount?: string }

const CTA_HEIGHT = 56

export function AccountFeature() {
  const { account } = useWalletUi()
  const owner = account?.publicKey?.toBase58()
  const [refreshing, setRefreshing] = useState(false)
  const { data: dom } = useUserDomains(account?.publicKey)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const invalidateBalance = useGetBalanceInvalidate({ address: account?.publicKey as PublicKey })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: account?.publicKey as PublicKey })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      owner ? refreshPortfolio(owner) : Promise.resolve(),
      invalidateBalance(),
      invalidateTokenAccounts(),
    ])
    setRefreshing(false)
  }, [owner, invalidateBalance, invalidateTokenAccounts])

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
      await Promise.all([
        refreshPortfolio(owner!),
        invalidateBalance(),
        invalidateTokenAccounts(),
      ])
    } finally {
      setBurnBusy(false)
    }
  }, [selected, account?.publicKey, burnTokens, invalidateBalance, invalidateTokenAccounts, owner])

  return (
    <AppPage>
      {account ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh()} />}
            contentContainerStyle={{
              paddingBottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0,
            }}
            scrollIndicatorInsets={{
              bottom: selectedCount > 0 ? CTA_HEIGHT + 16 : 0,
            }}
            contentInsetAdjustmentBehavior="never"
          >
            <AppView disableBg style={{ alignItems: 'center', gap: 4 }}>
              <AccountUiBalance address={account.publicKey} />

              {!!dom?.ordered?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  {dom.ordered.map((d) => {
                    const label = `${d.name}.${d.tld}`
                    const isSkr = d.tld === 'skr'
                    const isSaga = d.tld === 'saga'
                    const isPrimarySol = d.tld === 'sol' && d.primary

                    // .skr = green, .saga = purple, primary .sol = blue, others = neutral
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
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 999,
                          borderWidth: 1,
                          backgroundColor: bg,
                          borderColor: bd,
                        }}
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
