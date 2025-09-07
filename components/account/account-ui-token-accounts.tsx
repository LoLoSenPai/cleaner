import React, { useEffect, useMemo, useState } from 'react'
import { View, Image, ActivityIndicator, Pressable } from 'react-native'
import { AppText } from '@/components/app-text'
import { SellabilityBadge } from '@/components/account/SellabilityBadge'
import { LinearGradient } from 'expo-linear-gradient'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import {
  usePortfolioSnapshot,
  useEnsurePortfolio,
  hasFreshSnapshot,
  ensurePortfolio,
} from '@/utils/portfolio-cache'

type SelectItem = { mint: string; tokenAccount?: string }

type Props = {
  address: import('@solana/web3.js').PublicKey
  selectable?: boolean
  selected?: SelectItem[]
  onToggleSelect?: (item: SelectItem) => void
}

export function AccountUiTokenAccounts({ address, selectable = false, selected = [], onToggleSelect }: Props) {
  const { account } = useWalletUi()
  const owner = account?.publicKey?.toBase58()
  const [boot, setBoot] = useState(false)

  useEnsurePortfolio(owner)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!owner) return
      if (!hasFreshSnapshot(owner)) {
        setBoot(true)
        try {
          await ensurePortfolio(owner, { force: true })
        } finally {
          if (!cancelled) setBoot(false)
        }
      } else {
        setBoot(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [owner])

  const tokens = usePortfolioSnapshot(owner)

  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0))
  }, [tokens])

  if (boot) return <ActivityIndicator />
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
          const tokenAccount = token.tokenAccount
          const isSelected =
            selectable &&
            selected.some(s => s.mint === token.mint && (s.tokenAccount ? s.tokenAccount === tokenAccount : true))

          const Row = (
            <View
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
                    token.logoURI ||
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
                    decimals={token.decimals ?? 0}
                    testAmountUi={Math.min(100, token.amountUi)}
                  />
                </View>
              </View>

              {/* Amount + USD */}
              <View style={{ alignItems: 'flex-end' }}>
                <AppText style={{ fontWeight: '700', color: 'white' }}>
                  {token.amountUi.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </AppText>
                {typeof token.usd === 'number' && token.usd > 0 && (
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    ≈{' '}
                    {token.usd.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </AppText>
                )}
              </View>
            </View>
          )

          return (
            <View key={`${token.mint}:${tokenAccount ?? 'ata'}`}>
              {selectable ? (
                <Pressable onPress={() => onToggleSelect?.({ mint: token.mint, tokenAccount })}>
                  {Row}
                </Pressable>
              ) : (
                Row
              )}

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
