import React from 'react'
import { Platform, View } from 'react-native'

let BlurView: any = null
try {
    // si expo-blur est installé
    BlurView = require('expo-blur').BlurView
} catch { }

export function Card({
    children,
    style,
}: {
    children: React.ReactNode
    style?: any
}) {
    if (BlurView) {
        return (
            <BlurView intensity={22} tint="dark" style={[{ borderRadius: 24, overflow: 'hidden' }, style]}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1 }}>
                    {children}
                </View>
            </BlurView>
        )
    }
    // fallback sans blur
    return (
        <View
            style={[
                {
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                },
                style,
            ]}
        >
            {children}
        </View>
    )
}
