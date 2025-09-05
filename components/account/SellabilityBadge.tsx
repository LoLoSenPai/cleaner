import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AppText } from '@/components/app-text'
import { getSellability, Sellability } from '@/utils/sellability-cache'

export function SellabilityBadge({
    mint,
    decimals = 0,
    testAmountUi = 1,
}: { mint: string; decimals?: number; testAmountUi?: number }) {
    const [status, setStatus] = useState<Sellability>('unknown')

    useEffect(() => {
        let alive = true
        getSellability(mint, decimals, testAmountUi).then((s) => {
            if (alive && s !== 'unknown') setStatus(s)
        })
        return () => { alive = false }
    }, [mint, decimals, testAmountUi])

    if (status !== 'notsellable') return null

    return (
        <View
            style={{
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(255,0,0,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,0,0,0.28)',
                alignSelf: 'flex-start',
            }}
        >
            <AppText style={{ fontSize: 11, color: '#ffb4b4' }}>Not sellable</AppText>
        </View>
    )
}
