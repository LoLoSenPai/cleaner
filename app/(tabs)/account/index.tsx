import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Defs, LinearGradient as SvgGrad, Stop, Path, Rect } from 'react-native-svg'
import { AppView } from '@/components/app-view'
import { AppText } from '@/components/app-text'
import { Card } from '@/components/ui/card'
import { CleanAllSheet } from '@/components/bottom-sheets/clean-all-sheet'
import { useCleanerSummary } from '@/hooks/use-cleaner-summary'
import { AccountUiBalance } from '@/components/account/account-ui-balance'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { BaseButton } from '@/components/solana/base-button'
import { useEnsurePortfolio } from '@/utils/portfolio-cache'

export default function HomeScreen() {
  const { account } = useWalletUi()
  const router = useRouter()
  const s = useCleanerSummary()
  const [sheetOpen, setSheetOpen] = useState(false)
  const owner = account?.publicKey?.toBase58()

  useEnsurePortfolio(owner)

  return (
    <AppView style={{ gap: 16, paddingTop: 32, flex: 1, overflow: 'visible' }}>
      {/* ---- SOL balance (glass) ---- */}
      <Card>
        <View style={{ padding: 16 }}>
          {account ? (
            <AccountUiBalance address={account.publicKey} />
          ) : (
            <AppText type="title">0 <AppText style={{ opacity: 0.85 }}>SOL</AppText></AppText>
          )}
        </View>
      </Card>

      {/* ---- Actions grid (2x2) ---- */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ActionTile
          title="Close Accounts"
          subtitle={`${s.emptyAccounts} empty accounts`}
          onPress={() => router.push('/(tabs)/account/clean')}
          Icon={() => <IconClose />}
        />
        <ActionTile
          title="Burn Tokens"
          subtitle="Select tokens"
          onPress={() => router.push("/(tabs)/tokens")}
          Icon={() => <IconFlame />}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ActionTile
          title="Swap Dust"
          subtitle="Convert to SOL"
          onPress={() => router.push('/(tabs)/swap')}
          Icon={() => <IconSwap />}
        />
        {/* Free slot for future use */}
        <ActionTile
          title="Rewards"
          subtitle="Coming soon"
          disabled
          Icon={() => <IconStar />}
        />
      </View>

      {/* ---- Clean All CTA (gradient) ---- */}
      <View style={{ marginTop: 8, paddingHorizontal: 16 }}>
        <BaseButton
          variant="gradient"
          size="lg"
          fullWidth
          iconName="wand.and.stars"
          label="Clean All"
          onPress={() => setSheetOpen(true)}
        />
      </View>

      <CleanAllSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        stats={{ empty: s.emptyAccounts, estRent: s.estRent, dust: s.dustCount, dustEst: s.dustEst, spam: s.spamNfts }}
        onConfirm={(opts) => {
          setSheetOpen(false)
          if (opts.close) router.push('/(tabs)/account/clean')
          else if (opts.swap) router.push('/(tabs)/swap')
          // else if (opts.burn) router.push('/(tabs)/nfts')
        }}
      />
    </AppView>
  )
}

/* -------------------- Tiles -------------------- */
function ActionTile({
  title, subtitle, onPress, Icon, disabled,
}: {
  title: string; subtitle?: string; onPress?: () => void; Icon: React.ComponentType; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ flex: 1, borderRadius: 18, overflow: 'hidden', opacity: disabled ? 0.6 : 1 }}
    >
      <Card>
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ width: 36, height: 36 }}>
            <Icon />
          </View>
          <AppText style={{ fontWeight: '700', color: '#fff' }}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {subtitle}
            </AppText>
          )}
        </View>
      </Card>
    </Pressable>
  )
}

/* -------------------- Minimal neon icons (SVG) -------------------- */
function IconClose() {
  return (
    <Svg viewBox="0 0 24 24">
      <Defs>
        <SvgGrad id="g1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#00E0FF" />
          <Stop offset="100%" stopColor="#4DA1FF" />
        </SvgGrad>
      </Defs>
      <Rect x="3" y="5" width="18" height="14" rx="4" stroke="url(#g1)" strokeWidth="2" fill="none" />
      <Path d="M9 12h6" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 9v6" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function IconFlame() {
  return (
    <Svg viewBox="0 0 24 24">
      <Defs>
        <SvgGrad id="g2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FF6ADA" />
          <Stop offset="100%" stopColor="#7C5CFF" />
        </SvgGrad>
      </Defs>
      <Path
        d="M12 3c2 4-2 4-2 7s2 4 2 4 2-1 2-4-2-3 0-7c4 3 5 6 5 9a7 7 0 1 1-14 0c0-2 1-4 3-6"
        stroke="url(#g2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconSwap() {
  return (
    <Svg viewBox="0 0 24 24">
      <Defs>
        <SvgGrad id="g3" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#00E0FF" />
          <Stop offset="100%" stopColor="#4DA1FF" />
        </SvgGrad>
      </Defs>
      <Path d="M6 8h9l-2.5-2.5" stroke="url(#g3)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 16H9l2.5 2.5" stroke="url(#g3)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconStar() {
  return (
    <Svg viewBox="0 0 24 24">
      <Defs>
        <SvgGrad id="g4" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7C5CFF" />
          <Stop offset="100%" stopColor="#00E0FF" />
        </SvgGrad>
      </Defs>
      <Path
        d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3z"
        stroke="url(#g4)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}
