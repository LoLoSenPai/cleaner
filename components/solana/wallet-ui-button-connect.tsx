// components/solana/wallet-ui-button-connect.tsx
import React, { useCallback, useRef, useState } from 'react'
import { BaseButton } from '@/components/solana/base-button'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { openBatteryOptimizationSettings } from '@/utils/openBatterySettings'

function looksLikeMWAStall(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? '')
  return (
    /127\.0\.0\.1:/.test(msg) ||
    /Failed to connect/i.test(msg) ||
    /timeout/i.test(msg) ||
    /SessionEstablishmentTimeout/i.test(msg) ||
    /associate/i.test(msg) ||
    /WebSocket/i.test(msg)
  )
}

export function WalletUiButtonConnect({ label = 'Connect' }: { label?: string }) {
  const { connect } = useWalletUi()
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onPress = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setShowHelp(false)

    // Start a single-shot watchdog: if nothing resolves in 5s, show help.
    watchdog.current = setTimeout(() => {
      watchdog.current = null
      setShowHelp(true)
    }, 5000)

    try {
      await connect()
      // success → ensure help is not shown
      if (watchdog.current) {
        clearTimeout(watchdog.current)
        watchdog.current = null
      }
    } catch (e) {
      if (watchdog.current) {
        clearTimeout(watchdog.current)
        watchdog.current = null
      }
      if (looksLikeMWAStall(e)) {
        setShowHelp(true)
      } else {
        console.warn('Connect error:', e)
      }
    } finally {
      setBusy(false)
    }
  }, [busy, connect])

  return (
    <>
      <BaseButton
        label={busy ? 'Connecting…' : label}
        onPress={onPress}
        disabled={busy}
        variant="gradient"
        fullWidth
      />

      <ConfirmDialog
        visible={showHelp}
        title="Having trouble connecting?"
        message={
          "If your wallet opens but no approval sheet appears, Android may be limiting background activity.\n\n" +
          "Fix for this device:\n• Exempt Wallet Cleaner from battery optimization\n• Then try Connect again"
        }
        cancelText="Close"
        confirmText="Open battery settings"
        onCancel={() => setShowHelp(false)}
        onConfirm={async () => {
          await openBatteryOptimizationSettings()
          setShowHelp(false)
        }}
      />
    </>
  )
}
