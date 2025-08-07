import { AccountFeatureCleaner } from '@/components/account/account-feature-cleaner'
import { AppView } from '@/components/app-view'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useRouter } from 'expo-router'

export default function Clean() {
  const router = useRouter()
  const { account } = useWalletUi()

  if (!account) {
    return router.replace('/(tabs)/account')
  }

  return (
    <AppView style={{ flex: 1, padding: 16 }}>
      <AccountFeatureCleaner address={account.publicKey} />
    </AppView>
  )
}