import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusTokens } from '@/utils/parse-helius-assets'
import { PublicKey } from '@solana/web3.js'
import { ActivityIndicator, Image } from 'react-native'

export function AccountUiTokenAccounts({
  address,
}: {
  readonly address: PublicKey
}) {
  const { data, isLoading, isError, error } = useHeliusAssets(address)

  const tokens = data ? parseHeliusTokens(data.tokens) : []

  const sortedTokens = [...tokens].sort((a, b) => {
    const aValue = a.usdValue ?? 0
    const bValue = b.usdValue ?? 0
    return bValue - aValue
  })

  return (
    <>
      <AppText type="subtitle" style={{ marginBottom: 8 }}>
        Tokens
      </AppText>

      {isLoading && <ActivityIndicator animating={true} />}

      {isError && (
        <AppText style={{ padding: 8, backgroundColor: 'red' }}>
          Error: {error?.message.toString()}
        </AppText>
      )}

      {!isLoading && !isError && tokens.length === 0 && (
        <AppText>No tokens found.</AppText>
      )}

      {!isLoading &&
        !isError &&
        sortedTokens.map((token) => (
          <AppView
            key={token.mint}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}
          >
            {token.image && (
              <Image
                source={{
                  uri: token.image || 'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg',
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  marginRight: 12,
                }}
              />
            )}

            <AppText style={{ flex: 1 }}>
              {token.name} ({token.symbol})
            </AppText>

            <AppText style={{ fontWeight: 'bold' }}>
              {token.amount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{' '}
              <AppText style={{ color: '#888' }}>{token.symbol}</AppText>
            </AppText>
            {token.usdValue && (
              <AppText style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                ≈ {token.usdValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </AppText>
            )}
          </AppView>
        ))}
    </>
  )
}
