import { useRouter } from 'expo-router'
import { View, Pressable, Text } from 'react-native'

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

export function AccountUiButtons() {
  const router = useRouter()
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', width: '100%' }}>
      <Pill label="Send" onPress={() => router.navigate('/(tabs)/account/send')} />
      <Pill label="Receive" onPress={() => router.navigate('/(tabs)/account/receive')} />
      <Pill label="Clean" onPress={() => router.navigate('/(tabs)/account/clean')} />
    </View>
  )
}
