import { WalletUiDropdown } from '@/components/solana/wallet-ui-dropdown'
import { Stack } from 'expo-router'
import React from 'react'

export default function DemoLayout() {
  return (
    <Stack screenOptions={{ headerTitle: 'Swap', headerRight: () => <WalletUiDropdown /> }}>
      <Stack.Screen name="index" />
    </Stack>
  )
}
