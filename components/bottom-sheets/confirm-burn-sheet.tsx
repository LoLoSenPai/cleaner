import React from 'react'
import { View } from 'react-native'
import { AppText } from '@/components/app-text'
import { BaseButton } from '@/components/solana/base-button'

type Item = { label: string; subtitle?: string }
export function ConfirmBurnSheet({
    items,
    onCancel,
    onConfirm,
    busy,
}: {
    items: Item[]
    onCancel: () => void
    onConfirm: () => void
    busy?: boolean
}) {
    return (
        <View style={{ padding: 16, gap: 12 }}>
            <AppText type="subtitle">Confirm burn</AppText>
            <View style={{ gap: 8, maxHeight: 280 }}>
                {items.map((it, i) => (
                    <View key={i} style={{ gap: 2 }}>
                        <AppText>{it.label}</AppText>
                        {it.subtitle ? <AppText style={{ opacity: 0.7, fontSize: 12 }}>{it.subtitle}</AppText> : null}
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <BaseButton iconName="xmark.circle" label="Cancel" onPress={onCancel} />
                <BaseButton iconName="flame.fill" label={busy ? 'Burning…' : 'Burn'} onPress={onConfirm} disabled={busy} />
            </View>
        </View>
    )
}
