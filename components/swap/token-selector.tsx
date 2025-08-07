import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
} from 'react-native';
import { TokenInfo } from '@/types/tokens';

type Props = {
    tokens: TokenInfo[];
    selected: TokenInfo | null;
    onSelect: (token: TokenInfo) => void;
};

export const TokenSelector = ({ tokens, selected, onSelect }: Props) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return tokens.filter(
            (t) =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.symbol.toLowerCase().includes(search.toLowerCase())
        );
    }, [tokens, search]);

    const renderItem = ({ item }: { item: TokenInfo }) => (
        <TouchableOpacity
            onPress={() => onSelect(item)}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor:
                    selected?.mint === item.mint ? '#1c1c1e' : 'transparent',
            }}
        >
            <Image
                source={{ uri: item.logoURI }}
                style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>{item.symbol}</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{item.name}</Text>
            </View>
            {item.balance !== undefined && (
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontSize: 14 }}>
                        {(item.balance / Math.pow(10, item.decimals)).toFixed(4)}
                    </Text>
                    {item.usdValue !== undefined && (
                        <Text style={{ color: '#888', fontSize: 12 }}>
                            ${item.usdValue.toFixed(2)}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <TextInput
                placeholder="Search token..."
                placeholderTextColor="#666"
                style={{
                    backgroundColor: '#1c1c1e',
                    color: '#fff',
                    padding: 12,
                    margin: 12,
                    borderRadius: 12,
                }}
                onChangeText={setSearch}
                value={search}
            />
            <FlatList
                data={filtered}
                keyExtractor={(item, index) => item.mint ?? `${item.symbol}-${index}`}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
};
