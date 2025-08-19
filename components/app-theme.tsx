import { PropsWithChildren } from 'react'
import {
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  ThemeProvider,
} from '@react-navigation/native'
import { useColorScheme } from 'react-native'

export function useAppTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const Dark = {
    ...NavDark,
    colors: {
      ...NavDark.colors,
      background: '#0B0D12',
      card: 'transparent', // header/tab bar peuvent être transparents
      text: '#FFFFFF',
      border: 'rgba(255,255,255,0.12)',
      primary: '#4DA1FF',
    },
  }

  const Light = {
    ...NavLight,
    colors: {
      ...NavLight.colors,
      background: '#F7F8FA',
      card: '#FFFFFF',
      text: '#0C0F14',
      border: 'rgba(0,0,0,0.08)',
      primary: '#195EF7',
    },
  }

  return { isDark, theme: isDark ? (Dark as typeof NavDark) : (Light as typeof NavLight) }
}

export function AppTheme({ children }: PropsWithChildren) {
  const { theme } = useAppTheme()
  return <ThemeProvider value={theme}>{children}</ThemeProvider>
}
