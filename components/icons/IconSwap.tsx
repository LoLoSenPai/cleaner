import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg'
export default function IconSwap({ size = 26, active = false }) {
    const opacity = active ? 1 : 0.7
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Defs>
                <LinearGradient id="gs" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#00E0FF" />
                    <Stop offset="100%" stopColor="#4DA1FF" />
                </LinearGradient>
            </Defs>
            <Path d="M6 8h9l-2.5-2.5" stroke="url(#gs)" strokeWidth={1.8} opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18 16H9l2.5 2.5" stroke="url(#gs)" strokeWidth={1.8} opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    )
}
