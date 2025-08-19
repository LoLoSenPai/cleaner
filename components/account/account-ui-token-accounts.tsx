import React, { useMemo } from 'react'
import { View, Image, ActivityIndicator } from 'react-native'
import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusTokens } from '@/utils/parse-helius-assets'
import { PublicKey } from '@solana/web3.js'

export function AccountUiTokenAccounts({ address }: { readonly address: PublicKey }) {
  const { data, isLoading, isError, error } = useHeliusAssets(address)

  const sortedTokens = useMemo(() => {
    const tokens = data ? parseHeliusTokens(data.tokens) : []
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
        {sortedTokens.map((token, idx) => (
          <View key={token.mint}>
            <AppView
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 10,
              }}
            >
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

              {/* Nom / symbol */}
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: '700', color: 'white' }}>
                  {token.symbol || '—'}
                </AppText>
                <AppText
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}
                  numberOfLines={1}
                >
                  {token.name || token.mint.slice(0, 6)}
                </AppText>
              </View>

              {/* Montant + USD */}
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

            {/* séparateur */}
            {idx < sortedTokens.length - 1 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  )
}
