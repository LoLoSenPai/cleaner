import { Tabs } from 'expo-router'
import React from 'react'
import IconHome from '@/components/icons/IconHome'
import IconTokens from '@/components/icons/IconTokens'
import IconNfts from '@/components/icons/IconNfts'
import IconSwap from '@/components/icons/IconSwap'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B0D12',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          height: 60 + bottom,
          paddingBottom: Math.max(bottom, 8),
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4DA1FF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ title: 'Home', tabBarIcon: ({ focused }) => <IconHome active={focused} /> }} />
      <Tabs.Screen name="tokens" options={{ title: 'Tokens', tabBarIcon: ({ focused }) => <IconTokens active={focused} /> }} />
      <Tabs.Screen name="nfts" options={{ title: 'NFTs', tabBarIcon: ({ focused }) => <IconNfts active={focused} /> }} />
      <Tabs.Screen name="swap" options={{ title: 'Swap', tabBarIcon: ({ focused }) => <IconSwap active={focused} /> }} />
    </Tabs>
  )
}
