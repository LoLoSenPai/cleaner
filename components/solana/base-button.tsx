import { AppText } from '@/components/app-text'
import { useWalletUiTheme } from '@/components/solana/use-wallet-ui-theme'
import { UiIconSymbol } from '@/components/ui/ui-icon-symbol'
import { LinearGradient } from 'expo-linear-gradient'
import React, { ComponentProps } from 'react'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'

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
  const padStyle = size === 'lg' ? styles.padLg : styles.padMd

  const Label = ({ color }: { color: string }) => (
    <AppText
      style={[styles.labelBase, { color }]}
      numberOfLines={1}
      ellipsizeMode="tail"
      allowFontScaling={false}
    >
      {label}
    </AppText>
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
          style={[styles.row, styles.gradInner, padStyle]}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        >
          <UiIconSymbol name={iconName} color={iconColor ?? '#fff'} />
          <Label color="#fff" />
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
        styles.row,
        padStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <UiIconSymbol name={iconName} color={iconColor ?? textColor} />
      <Label color={textColor} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // outline
  outline: { borderWidth: 1, borderRadius: 50 },
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
  fullWidth: { width: '100%', maxWidth: 420 },
  gradInner: { borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.35)' },
  // label
  labelBase: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  // paddings
  padMd: { paddingHorizontal: 12, paddingVertical: 8 },
  padLg: { paddingHorizontal: 16, paddingVertical: 14 },
})
