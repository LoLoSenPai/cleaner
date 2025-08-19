import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg'
export default function IconHome({ size = 26, active = false }) {
    const opacity = active ? 1 : 0.7
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Defs>
                <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#4DA1FF" />
                    <Stop offset="100%" stopColor="#00E0FF" />
                </LinearGradient>
            </Defs>
            <Path
                d="M3 10.5 12 3l9 7.5v8A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-8Z"
                fill="none"
                stroke="url(#g1)"
                strokeWidth={1.8}
                opacity={opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Rect x="9" y="13" width="6" height="6" rx="1.5" stroke="url(#g1)" strokeWidth={1.6} opacity={opacity} />
        </Svg>
    )
}
