import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg'
export default function IconTokens({ size = 26, active = false }) {
    const opacity = active ? 1 : 0.7
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Defs>
                <LinearGradient id="gt" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#7C5CFF" />
                    <Stop offset="100%" stopColor="#4DA1FF" />
                </LinearGradient>
            </Defs>
            <Circle cx="8" cy="8" r="4.5" fill="none" stroke="url(#gt)" strokeWidth={1.8} opacity={opacity} />
            <Circle cx="16" cy="16" r="4.5" fill="none" stroke="url(#gt)" strokeWidth={1.8} opacity={opacity} />
            <Path d="M12 12l-1 1" stroke="url(#gt)" strokeWidth={1.6} opacity={opacity} strokeLinecap="round" />
        </Svg>
    )
}
