import React from 'react';
import { View, Image, Text, TouchableOpacity } from 'react-native';

type NftItemProps = {
    name: string;
    image: string;
    selected?: boolean;
    onSelect?: () => void;
};

export default function NftItem({ name, image, selected, onSelect }: NftItemProps) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={{
                width: '48%',
                marginBottom: 12,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? '#4CAF50' : '#ddd',
                borderRadius: 8,
                padding: 6
            }}
        >
            <Image
                source={image ? { uri: image } : require('@/assets/images/splash-icon.png')}
                style={{ width: '100%', height: 120, borderRadius: 6, backgroundColor: '#eee' }}
                resizeMode="cover"
            />
            <Text numberOfLines={1} style={{ marginTop: 4, fontWeight: '600' }}>
                {name}
            </Text>
        </TouchableOpacity>
    );
}
