import React from 'react'
import { View, type ViewProps } from 'react-native'
import { useThemeColor } from '@/hooks/use-theme-color'
import { LinearGradient } from 'expo-linear-gradient'

type AppViewProps = ViewProps & { disableBg?: boolean }

export function AppView({ style, children, disableBg, ...otherProps }: AppViewProps) {
  const backgroundColor = useThemeColor({}, 'background')

  return (
    <View
      style={[
        {
          flex: 1,
          position: 'relative',
          backgroundColor: disableBg ? 'transparent' : backgroundColor,
          gap: 8,
          paddingBottom: 16,
        },
        style,
      ]}
      {...otherProps}
    >
      {!disableBg && (
        <LinearGradient
          colors={['#0B0D12', '#0A1420']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      )}
      {children}
    </View>
  )
}
