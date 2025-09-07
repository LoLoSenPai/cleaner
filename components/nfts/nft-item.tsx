import React from 'react'
import { Image, Text, TouchableOpacity } from 'react-native'

type NftItemProps = {
    name: string
    image: string
    selected?: boolean
    onSelect?: () => void
}

export default function NftItem({ name, image, selected, onSelect }: NftItemProps) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={{
                width: '48%',
                marginBottom: 12,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? '#4DA1FF' : 'rgba(255,255,255,0.15)',
                borderRadius: 14,
                padding: 6,
                backgroundColor: 'rgba(255,255,255,0.06)',
            }}
        >
            <Image
                source={image ? { uri: image } : require('@/assets/images/splash-icon.png')}
                onError={() => { /* could set local state to switch to placeholder if needed */ }}
                style={{ width: '100%', height: 120, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}
                resizeMode="cover"
            />
            <Text numberOfLines={1} style={{ marginTop: 6, fontWeight: '600', color: 'rgba(255,255,255,0.92)' }}>
                {name || 'Untitled'}
            </Text>
        </TouchableOpacity>
    )
}
