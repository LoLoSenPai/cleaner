import { Stack } from 'expo-router'
import { WalletUiDropdown } from '@/components/solana/wallet-ui-dropdown'

export default function TokensLayout() {
    return (
        <Stack screenOptions={{
            headerTitle: 'Tokens', headerTitleStyle: { color: '#fff' }, headerStyle: {
                backgroundColor: '#0D0D0D',
            }, headerRight: () => <WalletUiDropdown />
        }}>
            <Stack.Screen name="index" />
        </Stack>
    )
}
