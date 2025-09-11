import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import NftList from '@/components/nfts/nft-list'
import { BaseButton } from '@/components/solana/base-button'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import Segmented from '@/components/ui/segmented'
import { useBurnNfts } from '@/hooks/use-burn-nfts'
import { useHeliusAssets } from '@/hooks/use-helius-assets'
import { parseHeliusNFTs } from '@/utils/parse-helius-assets'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import React, { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
          .map(n => ({
            mint: new PublicKey(n.id),
            isCompressed: n.isCompressed,
            tokenAccount: n.associatedTokenAddress ? new PublicKey(n.associatedTokenAddress) : undefined,
            isPnftHint: n.tokenStandard === 'ProgrammableNonFungible',
            frozenHint: n.frozen === true,
            isCoreHint: n.isCore === true,
            programIdHint:
              n.tokenProgramAddress === 'TokenzQdYGrDSDXi6MNLxwZenoJBNb8wDgib6A5nSJ8' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            collectionMintHint: n.collection ? new PublicKey(n.collection) : undefined,
          }))
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
    setConfirmOpen(false); setBusy(true)
    try {
      // --- DEBUG ICI ---
      {
        const heliusHints = nfts
          .filter(n => selectedIds.includes(n.id))
          .map(n => ({
            id: n.id,
            tokenProgram: n.tokenProgramAddress,
            ata: n.associatedTokenAddress,
            standard: n.tokenStandard,
            isCore: (n as any).isCore ?? false,
          }))
        const payload = selectedToBurn.map(i => ({
          mint: i.mint.toBase58(),
          isCompressed: i.isCompressed ?? false,
          tokenAccount: i.tokenAccount?.toBase58(),
          isPnftHint: i.isPnftHint ?? false,
          isCoreHint: i.isCoreHint ?? false,
          frozenHint: i.frozenHint ?? false,
          programIdHint: i.programIdHint?.toBase58(),
        }))
        console.log('burn debug — helius hints:', heliusHints)
        console.log('burn debug — ts:', Date.now(), 'payload:', JSON.stringify(payload))
      }
      // ------------------

      const res = await burnNfts(selectedToBurn) // { ok, skipped }
      console.log(`✅ burned=${res.ok.length} | skipped=${res.skipped.length}`, res)
      setSelectedIds([])
      await refetch()
    } finally {
      setBusy(false)
    }
  }, [burnNfts, refetch, selectedToBurn, nfts, selectedIds])

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
