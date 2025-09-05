import { AppText } from '@/components/app-text'
import { useWalletUiTheme } from '@/components/solana/use-wallet-ui-theme'
import { UiIconSymbol } from '@/components/ui/ui-icon-symbol'
import { LinearGradient } from 'expo-linear-gradient'
import React, { ComponentProps } from 'react'
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'

type IconName = ComponentProps<typeof UiIconSymbol>['name']
type IconColor = ComponentProps<typeof UiIconSymbol>['color']

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle | ViewStyle[]
  iconName?: IconName
  iconColor?: IconColor
  variant?: 'outline' | 'gradient'
  size?: 'md' | 'lg'
  fullWidth?: boolean
}

export function BaseButton({
  label,
  onPress,
  disabled = false,
  style,
  iconName = 'wallet.pass.fill',
  iconColor,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
}: Props) {
  const { backgroundColor, borderColor, textColor } = useWalletUiTheme()
  const padH = size === 'lg' ? 16 : 12
  const padV = size === 'lg' ? 14 : 8

  const Label = ({ color }: { color: string }) => (
    <AppText
      style={[styles.label, { color }]}
      numberOfLines={1}
      ellipsizeMode="tail"
      allowFontScaling={false}
    >
      {label}
    </AppText>
  )

  const Content = ({ color }: { color: string }) => (
    <View style={[styles.inner, { paddingHorizontal: padH, paddingVertical: padV }]}>
      <UiIconSymbol name={iconName} color={iconColor ?? color} />
      {/* Centered overlay; no right-side spacer */}
      <View pointerEvents="none" style={[styles.centerOverlay, { left: padH, right: padH }]}>
        <Label color={color} />
      </View>
    </View>
  )

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={['#3B82F6', '#22D3EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradWrap,
          fullWidth && styles.fullWidth,
          style as ViewStyle,
          disabled && { opacity: 0.6 },
        ]}
      >
        <TouchableOpacity
          disabled={disabled}
          onPress={disabled ? undefined : onPress}
          style={styles.gradInner}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        >
          <Content color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.outline,
        { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <Content color={textColor} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  inner: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 6 },

  // containers
  outline: { borderWidth: 1, borderRadius: 50 },
  gradWrap: {
    borderRadius: 28,
    padding: 2,
    shadowColor: '#22D3EE',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    alignSelf: 'center',
  },
  fullWidth: { width: '100%', maxWidth: 420 },
  gradInner: { borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.35)' },

  // centered label overlay
  centerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },

  // label
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
})
