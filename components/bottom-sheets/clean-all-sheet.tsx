import React, { useState, useEffect } from 'react'
import { useDustSwap } from '@/hooks/use-dust-swap'
import { View, Text, Switch, Pressable } from 'react-native'
import { Card } from '@/components/ui/card'

type Stats = { empty: number; estRent: string; dust: number; dustEst: string }

export function CleanAllSheet({
    visible,
    onClose,
    stats,
    onConfirm,
    initialThreshold = 2,
}: {
    visible: boolean
    onClose: () => void
    stats: Stats
    onConfirm: (opts: { close: boolean; swap: boolean; threshold: number }) => void
    initialThreshold?: number
}) {
    const [close, setClose] = useState(true)
    const [swap, setSwap] = useState(true)
    const [threshold, setThreshold] = useState<number>(initialThreshold)
    const { preview, loading, refresh } = useDustSwap()

    useEffect(() => {
        if (!visible) return
        if (!swap) return
        refresh(threshold)
    }, [visible, swap, threshold, refresh])

    const dustCount = preview.length
    const dustTotalUsd = preview.reduce((s, p) => s + (p.usdEst || 0), 0)

    if (!visible) return null

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0, left: 0,
                zIndex: 9999,
                elevation: 9999,
            }}
        >
            {/* Backdrop */}
            <Pressable
                onPress={onClose}
                style={{
                    position: 'absolute',
                    top: 0, right: 0, bottom: 0, left: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                }}
            />

            {/* Sheet */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
                <Card style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'rgba(16,18,24,0.96)' }}>
                    <View style={{ padding: 20, gap: 14 }}>
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', textAlign: 'center' }}>
                            Clean All
                        </Text>

                        <Row label="Close Empty Accounts" sub={`${stats.empty} accounts • ≈ ${stats.estRent} SOL`}>
                            <Switch value={close} onValueChange={setClose} />
                        </Row>

                        <Row
                            label="Swap Dust Tokens"
                            sub={
                                loading
                                    ? 'Loading…'
                                    : `${dustCount} tokens • ≈ ${dustTotalUsd.toFixed(4)} USD`
                            }
                        >
                            <Switch value={swap} onValueChange={setSwap} />
                        </Row>

                        {/* Threshold chips (shown only if swap is enabled) */}
                        {swap && (
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.75)' }}>Max per token</Text>
                                <ChipRow
                                    values={[1, 2, 5, 10, 20, 50]}
                                    selected={threshold}
                                    onSelect={setThreshold}
                                />
                            </View>
                        )}

                        <Pressable
                            onPress={() => onConfirm({ close, swap, threshold })}
                            style={{
                                height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>
                                CONFIRM{swap ? ` — <$${threshold}` : ''}
                            </Text>
                        </Pressable>

                        <Pressable onPress={onClose} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Cancel</Text>
                        </Pressable>
                    </View>
                </Card>
            </View>
        </View>
    )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
            }}
        >
            <View style={{ flex: 1 }}>
                <Text style={{ color: 'white' }}>{label}</Text>
                {!!sub && <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{sub}</Text>}
            </View>
            {children}
        </View>
    )
}

function ChipRow({
    values,
    selected,
    onSelect,
}: {
    values: number[]
    selected: number
    onSelect: (v: number) => void
}) {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {values.map((v) => {
                const isSel = v === selected
                return (
                    <Pressable
                        key={v}
                        onPress={() => onSelect(v)}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: isSel ? 'rgba(255,255,255,0.18)' : 'transparent',
                            borderWidth: isSel ? 1 : 0,
                            borderColor: 'rgba(255,255,255,0.25)',
                        }}
                    >
                        <Text style={{ color: isSel ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: '700' }}>${v}</Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
