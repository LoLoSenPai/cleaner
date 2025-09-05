import { useAuth } from '@/components/auth/auth-provider'
import { BaseButton } from '@/components/solana/base-button'
import React from 'react'

export function WalletUiButtonDisconnect({ label = 'Disconnect' }: { label?: string }) {
  const { signOut } = useAuth()

  return <BaseButton label={label} onPress={() => signOut()} />
}
