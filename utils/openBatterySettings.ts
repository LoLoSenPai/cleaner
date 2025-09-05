// utils/openBatterySettings.ts
import { Platform } from 'react-native'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Application from 'expo-application'

export async function openBatteryOptimizationSettings() {
  if (Platform.OS !== 'android') return
  const pkg = Application.applicationId

  // Try per-app battery screen, then generic optimization list, then app details.
  const tryOpen = async (action: string, data?: string) => {
    try {
      await IntentLauncher.startActivityAsync(action as any, data ? { data } : undefined)
      return true
    } catch {
      return false
    }
  }

  if (await tryOpen('android.settings.APP_BATTERY_SETTINGS', `package:${pkg}`)) return
  if (await tryOpen('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')) return
  await tryOpen('android.settings.APPLICATION_DETAILS_SETTINGS', `package:${pkg}`)
}
