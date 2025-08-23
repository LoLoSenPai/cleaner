// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolViewProps } from 'expo-symbols'
import { ComponentProps } from 'react'
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native'

type UiIconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>
export type UiIconSymbolName = keyof typeof MAPPING

const MAPPING = {
  'gearshape.fill': 'settings',
  'wallet.pass.fill': 'wallet',
  'ladybug.fill': 'bug-report',

  // Added for your app:
  'flame.fill': 'whatshot',
  'wand.and.stars': 'auto-fix-high',
  'arrow.2.squarepath': 'swap-horiz',        // or 'autorenew'
  'trash.fill': 'delete',
  'checkmark.circle.fill': 'check-circle',
  'circle': 'radio-button-unchecked',
} as UiIconMapping

export function UiIconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: UiIconSymbolName
  size?: number
  color: string | OpaqueColorValue
  style?: StyleProp<TextStyle>
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />
}
