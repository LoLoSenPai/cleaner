// components/app-providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { ClusterProvider } from './cluster/cluster-provider'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { AppTheme } from '@/components/app-theme'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import { useColorScheme } from 'react-native'

const queryClient = new QueryClient()

function PaperThemeBridge({ children }: PropsWithChildren) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const dark = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      background: '#0B0D12',
      surface: 'rgba(255,255,255,0.06)',
      surfaceVariant: 'rgba(255,255,255,0.08)',
      onSurface: 'rgba(255,255,255,0.92)',
      outline: 'rgba(255,255,255,0.12)',
      primary: '#4DA1FF',
      secondary: '#00E0FF',
    },
  }

  const light = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      background: '#F7F8FA',
      surface: '#FFFFFF',
      surfaceVariant: '#F2F4F7',
      onSurface: '#0C0F14',
      outline: 'rgba(0,0,0,0.12)',
      primary: '#195EF7',
      secondary: '#0066FF',
    },
  }

  return <PaperProvider theme={isDark ? dark : light}>{children}</PaperProvider>
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppTheme>
      <PaperThemeBridge>
        <QueryClientProvider client={queryClient}>
          <ClusterProvider>
            <SolanaProvider>
              <AuthProvider>{children}</AuthProvider>
            </SolanaProvider>
          </ClusterProvider>
        </QueryClientProvider>
      </PaperThemeBridge>
    </AppTheme>
  )
}
