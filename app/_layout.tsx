import { AppProviders } from '@/components/app-providers'
import { AppSplashController } from '@/components/app-splash-controller'
import { useAuth } from '@/components/auth/auth-provider'
import { useTrackLocations } from '@/hooks/use-track-locations'
import { PortalHost } from '@rn-primitives/portal'
import { useFonts } from 'expo-font'
import { Stack, router } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as NavigationBar from 'expo-navigation-bar'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useTrackLocations((pathname, params) => {
    console.log(`Track ${pathname}`, { params })
  })
  const [loaded] = useFonts({
    'GSC-Regular': require('../assets/fonts/GoogleSansCode-Regular.ttf'),
    'GSC-Medium': require('../assets/fonts/GoogleSansCode-Medium.ttf'),
    'GSC-SemiBold': require('../assets/fonts/GoogleSansCode-SemiBold.ttf'),
    'GSC-Bold': require('../assets/fonts/GoogleSansCode-Bold.ttf'),
    'GSC-Italic': require('../assets/fonts/GoogleSansCode-Italic.ttf'),
  })

  useEffect(() => {
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => { })
  }, [])

  const onLayoutRootView = useCallback(async () => {
    console.log('onLayoutRootView')
    if (loaded) {
      console.log('loaded')
      await SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) return null

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AppProviders>
          <AppSplashController />
          <RootNavigator />
          <StatusBar style="light" translucent />
        </AppProviders>
        <PortalHost />
      </SafeAreaProvider>
    </View>
  )
}

function RootNavigator() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    router.replace(isAuthenticated ? '/(tabs)' : '/sign-in')
  }, [isAuthenticated])

  return (
    <Stack key={isAuthenticated ? 'auth' : 'guest'} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
