import React from 'react'
import { StyleSheet, Text, type TextProps, useColorScheme } from 'react-native'

export type AppTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'
}

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'GSC-Regular',
  '200': 'GSC-Regular',
  '300': 'GSC-Regular',
  '400': 'GSC-Regular',
  normal: 'GSC-Regular',
  '500': 'GSC-Medium',
  '600': 'GSC-SemiBold',
  '700': 'GSC-Bold',
  bold: 'GSC-Bold',
  '800': 'GSC-Bold',
  '900': 'GSC-Bold',
}

const WEIGHT_BY_TYPE: Record<NonNullable<AppTextProps['type']>, string> = {
  default: '400',
  defaultSemiBold: '600',
  title: '700',
  subtitle: '600',
  link: '500',
}

export function AppText({ style, type = 'default', ...rest }: AppTextProps) {
  const scheme = useColorScheme()
  const color = scheme === 'dark' ? 'rgba(255,255,255,0.92)' : '#0C0F14'

  const flat = StyleSheet.flatten(style as any) || {}
  const passedWeight = (flat.fontWeight as string | undefined)?.toString()
  const weight = passedWeight ?? WEIGHT_BY_TYPE[type]
  const family = FAMILY_BY_WEIGHT[weight] ?? 'GSC-Regular'

  return (
    <Text
      {...rest}
      style={[
        { color, fontFamily: family },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        style,
        { fontWeight: 'normal' as const },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 28, lineHeight: 32 },
  subtitle: { fontSize: 20 },
  link: { lineHeight: 30, fontSize: 16, color: '#4DA1FF' },
})
