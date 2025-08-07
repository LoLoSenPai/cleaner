import React from 'react';
import { View, FlatList } from 'react-native';
import NftItem from './nft-item';

type NftListProps = {
    nfts: { id: string; name: string; image: string }[];
    onSelect?: (id: string) => void;
    selectedIds?: string[];
};

export default function NftList({ nfts, onSelect, selectedIds = [] }: NftListProps) {
    return (
        <FlatList
            data={nfts}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <NftItem
                    name={item.name}
                    image={item.image}
                    selected={selectedIds.includes(item.id)}
                    onSelect={() => onSelect && onSelect(item.id)}
                />
            )}
        />
    );
}
