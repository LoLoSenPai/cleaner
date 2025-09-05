import React, { useState, useMemo, useCallback } from 'react'
import { View } from 'react-native'
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
import ConfirmDialog from '@/components/ui/confirm-dialog'

export default function NftsScreen() {
  const { account } = useWalletUi()
  const { data, isLoading, isError, refetch } = useHeliusAssets(account?.publicKey!)
  const [selectedTab, setSelectedTab] = useState<'nft' | 'cnft'>('nft')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { mutateAsync: burnNfts } = useBurnNfts()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const insets = useSafeAreaInsets()

  const all = useMemo(() => parseHeliusNFTs(data?.nfts ?? []), [data?.nfts])
  const nfts = useMemo(() => all.filter(n => !n.isCompressed), [all])
  const cnfts = useMemo(() => all.filter(n => n.isCompressed), [all])

  const isCnftTab = selectedTab === 'cnft'
  const currentList = isCnftTab ? cnfts : nfts

  const selectedToBurn = useMemo(
    () =>
      !isCnftTab
        ? nfts
          .filter(n => selectedIds.includes(n.id))
          .map(n => ({ mint: new PublicKey(n.id) }))
        : [],
    [isCnftTab, nfts, selectedIds],
  )

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const openConfirm = () => {
    if (!selectedToBurn.length) return
    setConfirmOpen(true)
  }

  const doBurn = useCallback(async () => {
    if (!selectedToBurn.length) return
    setConfirmOpen(false)
    setBusy(true)
    try {
      await burnNfts(selectedToBurn)
      setSelectedIds([])
      await refetch()
    } finally {
      setBusy(false)
    }
  }, [burnNfts, refetch, selectedToBurn])

  const selectedCount = selectedToBurn.length
  const currentLabel = isCnftTab ? 'cNFTs' : 'NFTs'

  if (!account?.publicKey) return <AppText>Connect your wallet</AppText>
  if (isLoading) return <AppText>Loading NFTs...</AppText>
  if (isError) return <AppText>Error loading NFTs</AppText>

  return (
    <View style={{ flex: 1 }}>
      <AppView
        style={{
          flex: 1,
          paddingTop: 0,
          paddingHorizontal: 16,
          paddingBottom: (!isCnftTab && selectedCount > 0 ? 56 + 16 + insets.bottom : 0),
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
            onPress={openConfirm}
          />
        </View>
      )}

      <ConfirmDialog
        visible={confirmOpen}
        title="Confirm burn"
        message={`You are about to permanently burn ${selectedCount} NFT(s). This cannot be undone.`}
        cancelText="Cancel"
        confirmText={busy ? 'Burning…' : 'Burn'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { if (!busy) void doBurn(); }}  // wrap async → void
      />
    </View>
  )
}
