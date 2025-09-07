import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { useAuth } from '@/components/auth/auth-provider'
import { AppConfig } from '@/constants/app-config'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SignIn() {
  const { signIn, isLoading } = useAuth()

  return (
    <ImageBackground
      source={require('../assets/splash/bg_launch.png')} // 2048x2048
      resizeMode="cover"
      style={styles.bg}
    >
      <View pointerEvents="none" style={styles.overlay} />

      <AppView disableBg>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <SafeAreaView style={styles.safe}>
            <View />
            <View style={styles.center}>
              <AppText type="title" style={{ color: '#fff' }}>
                {AppConfig.name}
              </AppText>
              <Image
                source={require('../assets/splash/clyra-logo.png')}
                style={{ width: 350, height: 350 }}
                contentFit="contain"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <LinearGradient
                colors={['#3B82F6', '#22D3EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <Pressable
                  disabled={isLoading}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  style={[styles.btnInner, isLoading && { opacity: 0.7 }]}
                  onPress={async () => {
                    try {
                      await signIn();
                    } catch (e) {
                      console.log('[CONNECT] error:', e);
                    }
                  }}
                >
                  <Text style={styles.btnText}>{isLoading ? 'Connecting…' : 'Connect'}</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </SafeAreaView>
        )}
      </AppView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  safe: { flex: 1, justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: 16 },

  // bouton
  btnGradient: {
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 2,
    shadowColor: '#22D3EE',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  btnInner: {
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
