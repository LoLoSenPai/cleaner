import React, { ComponentProps } from 'react'
import { AppText } from '@/components/app-text'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { UiIconSymbol } from '@/components/ui/ui-icon-symbol'
import { useWalletUiTheme } from '@/components/solana/use-wallet-ui-theme'
import { LinearGradient } from 'expo-linear-gradient'

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
          style={[
            styles.gradInner,
            size === 'lg' ? styles.padLg : styles.padMd,
            { flexDirection: 'row', alignItems: 'center', gap: 8 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        >
          <UiIconSymbol name={iconName} color={iconColor ?? '#fff'} />
          <AppText style={styles.gradText}>{label}</AppText>
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
        size === 'lg' ? styles.padLg : styles.padMd,
        { flexDirection: 'row', alignItems: 'center', gap: 8 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <UiIconSymbol name={iconName} color={iconColor ?? textColor} />
      <AppText style={{ color: textColor, fontWeight: '700' }}>{label}</AppText>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // outline
  outline: {
    borderWidth: 1,
    borderRadius: 50,
  },
  // gradient
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
  fullWidth: {
    width: '100%',
    maxWidth: 420,
  },
  gradInner: {
    borderRadius: 26,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  gradText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    flex: 1,
  },
  // paddings
  padMd: { paddingHorizontal: 16, paddingVertical: 8 },
  padLg: { paddingHorizontal: 24, paddingVertical: 14 },
})
