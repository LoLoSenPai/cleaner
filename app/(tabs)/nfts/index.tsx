import React, { useState } from 'react'
import { AppView } from '@/components/app-view'
import { AppText } from '@/components/app-text'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusNFTs } from '@/utils/parse-helius-assets'
import NftList from '@/components/nfts/nft-list'
import { SegmentedButtons } from 'react-native-paper'

export default function NftsScreen() {
  const { account } = useWalletUi()
  const { data, isLoading, isError } = useHeliusAssets(account?.publicKey!)
  const [selectedTab, setSelectedTab] = useState<'nft' | 'cnft'>('nft')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (!account?.publicKey) return <AppText>Connect your wallet</AppText>
  if (isLoading) return <AppText>Loading NFTs...</AppText>
  if (isError) return <AppText>Error loading NFTs</AppText>

  const all = parseHeliusNFTs(data?.nfts ?? [])
  const nfts = all.filter((n) => !n.isCompressed)
  const cnfts = all.filter((n) => n.isCompressed)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const currentList = selectedTab === 'nft' ? nfts : cnfts
  const currentLabel = selectedTab === 'nft' ? 'NFTs' : 'cNFTs'

  return (
    <AppView>
      <SegmentedButtons
        value={selectedTab}
        onValueChange={(v) => setSelectedTab(v as 'nft' | 'cnft')}
        buttons={[
          { value: 'nft', label: 'NFTs' },
          { value: 'cnft', label: 'cNFTs' },
        ]}
        style={{ marginBottom: 12 }}
      />

      <AppText type="subtitle" style={{ marginBottom: 8 }}>
        {currentLabel}
      </AppText>

      {currentList.length === 0 ? (
        <AppText>No {currentLabel} found.</AppText>
      ) : (
        <NftList
          nfts={currentList.map(({ id, name, image }) => ({
            id,
            name,
            image: image ?? '',
          }))}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
        />
      )}
    </AppView>
  )
}
