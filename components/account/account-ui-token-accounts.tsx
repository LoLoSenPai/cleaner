import React, { useMemo } from 'react'
import { View, Image, ActivityIndicator, Pressable } from 'react-native'
import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusTokens } from '@/utils/parse-helius-assets'
import { PublicKey } from '@solana/web3.js'
import { SellabilityBadge } from '@/components/account/SellabilityBadge'
import { LinearGradient } from 'expo-linear-gradient'

type SelectItem = { mint: string; tokenAccount?: string }

type Props = {
  address: PublicKey
  /** Optional selection mode */
  selectable?: boolean
  /** Selected items (mint + optional tokenAccount) */
  selected?: SelectItem[]
  /** Toggle callback when a row is pressed */
  onToggleSelect?: (item: SelectItem) => void
}

export function AccountUiTokenAccounts({ address, selectable = false, selected = [], onToggleSelect }: Props) {
  const { data, isLoading, isError, error } = useHeliusAssets(address)

  // parseHeliusTokens() is your helper; we augment the type locally to include optional tokenAccount
  const sortedTokens = useMemo(() => {
    const tokens = data ? (parseHeliusTokens(data.tokens) as Array<{
      mint: string
      image?: string
      symbol?: string
      name?: string
      amount: number
      usdValue?: number
      tokenAccount?: string
    }>) : []
    return [...tokens].sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
  }, [data])

  if (isLoading) return <ActivityIndicator />
  if (isError) {
    return (
      <AppText style={{ padding: 8, backgroundColor: 'rgba(255,0,0,0.15)' }}>
        Error: {error?.message?.toString?.()}
      </AppText>
    )
  }
  if (!sortedTokens.length) return <AppText>No tokens found.</AppText>

  return (
    <View style={{ width: '100%' }}>
      <AppText type="subtitle" style={{ marginBottom: 8 }}>
        Tokens
      </AppText>

      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        {sortedTokens.map((token, idx) => {
          const tokenAccount = token.tokenAccount // may be undefined
          const isSelected =
            selectable &&
            selected.some(s => s.mint === token.mint && (s.tokenAccount ? s.tokenAccount === tokenAccount : true))

          const Row = (
            <AppView
              style={{
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 10,
                backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              {isSelected && (
                <LinearGradient
                  colors={['#3B82F6', '#22D3EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    borderTopLeftRadius: 10,
                    borderBottomLeftRadius: 10,
                  }}
                />
              )}

              {/* Logo */}
              <Image
                source={{
                  uri:
                    token.image ||
                    'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg',
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  marginRight: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />

              {/* Name / symbol */}
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: '700', color: 'white' }}>
                  {token.symbol || '—'}
                </AppText>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                    {token.name || token.mint.slice(0, 6)}
                  </AppText>
                  <SellabilityBadge
                    mint={token.mint}
                    decimals={(token as any).decimals ?? 0}
                    testAmountUi={Math.min(100, token.amount)} 
                  />
                </View>
              </View>

              {/* Amount + USD */}
              <View style={{ alignItems: 'flex-end' }}>
                <AppText style={{ fontWeight: '700', color: 'white' }}>
                  {token.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </AppText>
                {typeof token.usdValue === 'number' && (
                  <AppText
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}
                  >
                    ≈{' '}
                    {token.usdValue.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </AppText>
                )}
              </View>
            </AppView>
          )

          return (
            <View key={`${token.mint}:${tokenAccount ?? 'ata'}`}>
              {selectable ? (
                <Pressable
                  onPress={() => onToggleSelect?.({ mint: token.mint, tokenAccount })}
                >
                  {Row}
                </Pressable>
              ) : (
                Row
              )}

              {/* Separator */}
              {idx < sortedTokens.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                  }}
                />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
