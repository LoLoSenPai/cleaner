import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AppText } from '@/components/app-text'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const LITE = 'https://lite-api.jup.ag/swap/v1/quote'

type Status = 'unknown' | 'sellable' | 'notsellable'

export function SellabilityBadge({
    mint,
    decimals = 0,
    testAmountUi = 1,  // <= montant UI à tester (par ex. min(100, balance))
}: {
    mint: string
    decimals?: number
    testAmountUi?: number
}) {
    const [status, setStatus] = useState<Status>('unknown')

    useEffect(() => {
        let dead = false
            ; (async () => {
                try {
                    const ui = Math.max(1e-9, Number.isFinite(testAmountUi) ? testAmountUi : 1)
                    const baseAmount = Math.max(
                        1,
                        Math.floor(ui * 10 ** Math.min(decimals || 0, 9))
                    )
                    const url =
                        `${LITE}?inputMint=${mint}&outputMint=${SOL_MINT}` +
                        `&amount=${baseAmount}&slippage=1`

                    const res = await fetch(url)
                    const text = await res.text()
                    let json: any = null
                    try { json = JSON.parse(text) } catch { json = null }

                    const routePlan = Array.isArray(json?.routePlan) ? json.routePlan : []
                    const routes = Array.isArray(json?.routes) ? json.routes : []
                    const has = (routePlan.length > 0) || (routes.length > 0)

                    if (!dead) setStatus(has ? 'sellable' : 'notsellable')
                } catch {
                    if (!dead) setStatus('unknown')
                }
            })()
        return () => { dead = true }
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
