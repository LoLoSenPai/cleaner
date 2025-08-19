import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg'
export default function IconNfts({ size = 26, active = false }) {
    const opacity = active ? 1 : 0.7
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Defs>
                <LinearGradient id="gn" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FF6ADA" />
                    <Stop offset="100%" stopColor="#7C5CFF" />
                </LinearGradient>
            </Defs>
            <Rect x="3.5" y="5" width="17" height="14" rx="3" fill="none" stroke="url(#gn)" strokeWidth={1.8} opacity={opacity} />
            <Path d="M7 14l2.3-2.7 2.1 2.2 3.1-3.5L17 12" fill="none" stroke="url(#gn)" strokeWidth={1.8} opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    )
}
