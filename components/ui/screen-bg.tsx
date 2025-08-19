// components/ui/screen-bg.tsx
import React from 'react'
import { StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export function ScreenBG() {
    return (
        <LinearGradient
            colors={['#0B0D12', '#0A1420']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
        />
    )
}
