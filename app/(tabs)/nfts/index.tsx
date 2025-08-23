import React, { useState } from 'react'
import { View, Alert } from 'react-native'
import { PublicKey } from '@solana/web3.js'
import { AppView } from '@/components/app-view'
import { AppText } from '@/components/app-text'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusNFTs } from '@/utils/parse-helius-assets'
import NftList from '@/components/nfts/nft-list'
import Segmented from '@/components/ui/segmented'
import { BaseButton } from '@/components/solana/base-button'
import { useBurnNfts } from '@/hooks/use-burn-nfts'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NftsScreen() {
  const { account } = useWalletUi()
  const { data, isLoading, isError, refetch } = useHeliusAssets(account?.publicKey!)
  const [selectedTab, setSelectedTab] = useState<'nft' | 'cnft'>('nft')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { mutateAsync: burnNfts } = useBurnNfts()
  const [busy, setBusy] = useState(false)
  const insets = useSafeAreaInsets()

  if (!account?.publicKey) return <AppText>Connect your wallet</AppText>
  if (isLoading) return <AppText>Loading NFTs...</AppText>
  if (isError) return <AppText>Error loading NFTs</AppText>

  const all = parseHeliusNFTs(data?.nfts ?? [])
  const nfts = all.filter((n) => !n.isCompressed)
  const cnfts = all.filter((n) => n.isCompressed)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const isCnftTab = selectedTab === 'cnft'
  const currentList = isCnftTab ? cnfts : nfts
  const currentLabel = isCnftTab ? 'cNFTs' : 'NFTs'

  const selectedToBurn = !isCnftTab
    ? nfts.filter((n) => selectedIds.includes(n.id)).map((n) => ({ mint: new PublicKey(n.id) }))
    : []

  const onBurnSelected = () => {
    if (!selectedToBurn.length) return
    Alert.alert(
      'Confirm burn',
      `You are about to permanently burn ${selectedToBurn.length} NFT(s). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Burn',
          style: 'destructive',
          onPress: async () => {
            setBusy(true)
            try {
              await burnNfts(selectedToBurn)
              setSelectedIds([])
              await refetch()
            } finally {
              setBusy(false)
            }
          },
        },
      ],
    )
  }

  const selectedCount = selectedToBurn.length

  return (
    <View style={{ flex: 1 }}>
      <AppView
        style={{
          flex: 1,
          paddingBottom: (!isCnftTab && selectedCount > 0 ? 56 + 16 : 0) + insets.bottom,
        }}
      >
        <Segmented
          value={selectedTab}
          onChange={(v) => {
            setSelectedTab(v as 'nft' | 'cnft')
            setSelectedIds([]) // reset selection when switching tab
          }}
          options={[
            { value: 'nft', label: 'NFTs' },
            { value: 'cnft', label: 'cNFTs' },
          ]}
        />

        <AppView style={{ marginTop: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText type="subtitle">{currentLabel}</AppText>
          {isCnftTab && <AppText style={{ opacity: 0.7 }}>Burn not supported for cNFTs</AppText>}
        </AppView>

        {currentList.length === 0 ? (
          <AppText>No {currentLabel} found.</AppText>
        ) : (
          <NftList
            nfts={currentList.map(({ id, name, image }) => ({ id, name, image: image ?? '' }))}
            selectedIds={selectedIds}
            onSelect={toggleSelect}
          />
        )}
      </AppView>

      {!isCnftTab && selectedCount > 0 && (
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
            label={busy ? 'Burning…' : `Burn selected (${selectedCount})`}
            disabled={busy}
            onPress={onBurnSelected}
          />
        </View>
      )}
    </View>
  )
}
