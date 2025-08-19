import { WalletUiDropdown } from '@/components/solana/wallet-ui-dropdown'
import { Stack } from 'expo-router'
import React from 'react'

export default function DemoLayout() {
  return (
    <Stack screenOptions={{
      headerTitle: 'Swap', headerTitleStyle: { color: '#fff' }, headerStyle: {
        backgroundColor: '#0D0D0D',
      }, headerRight: () => <WalletUiDropdown />
    }}>
      <Stack.Screen name="index" />
    </Stack>
  )
}
