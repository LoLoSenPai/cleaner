import React from 'react'
import { View, Pressable, Text } from 'react-native'

type Props = {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
}

export default function Segmented({ options, value, onChange }: Props) {
    return (
        <View
            style={{
                flexDirection: 'row',
                gap: 6,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                padding: 4,
                borderRadius: 16,
            }}
        >
            {options.map((opt) => {
                const active = value === opt.value
                return (
                    <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                            borderColor: active ? 'rgba(255,255,255,0.22)' : 'transparent',
                            borderWidth: active ? 1 : 0,
                        }}
                    >
                        <Text style={{ color: active ? 'white' : 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                            {opt.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
