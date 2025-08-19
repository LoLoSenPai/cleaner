import { StyleSheet, Text, type TextProps, useColorScheme } from 'react-native'

export type AppTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'
}

export function AppText({ style, type = 'default', ...rest }: AppTextProps) {
  const scheme = useColorScheme()
  const color = scheme === 'dark' ? 'rgba(255,255,255,0.92)' : '#0C0F14'

  return (
    <Text
      style={[
        { color },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  subtitle: { fontSize: 20, fontWeight: '700' },
  link: { lineHeight: 30, fontSize: 16, color: '#4DA1FF' },
})
