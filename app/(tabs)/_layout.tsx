import { Tabs } from 'expo-router'
import React from 'react'
import { Image } from 'react-native'

export default function TabLayout() {
  const iconStyle = { width: 28, height: 28 }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* The index redirects to the account screen */}
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: 'none' } }} />

      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: () => (
            <Image source={require('@/assets/images/account-icon.png')} style={iconStyle} />
          ),
        }}
      />

      <Tabs.Screen
        name="nfts"
        options={{
          title: 'NFTs',
          tabBarIcon: () => (
            <Image source={require('@/assets/images/nft-icon.png')} style={iconStyle} />
          ),
        }}
      />

      <Tabs.Screen
        name="swap"
        options={{
          title: 'Swap',
          tabBarIcon: () => (
            <Image source={require('@/assets/images/swap-icon.png')} style={iconStyle} />
          ),
        }}
      />
    </Tabs>
  )
}
