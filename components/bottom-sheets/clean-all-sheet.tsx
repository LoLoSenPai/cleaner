// components/bottom-sheets/clean-all-sheet.tsx
import React, { useState } from 'react'
import { View, Text, Switch, Pressable } from 'react-native'
import { Card } from '@/components/ui/card'

export function CleanAllSheet({
    visible,
    onClose,
    stats,
    onConfirm,
}: {
    visible: boolean
    onClose: () => void
    stats: { empty: number; estRent: string; dust: number; dustEst: string; spam: number }
    onConfirm: (opts: { close: boolean; swap: boolean; burn: boolean }) => void
}) {
    const [close, setClose] = useState(true)
    const [swap, setSwap] = useState(true)
    const [burn, setBurn] = useState(true)

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
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', textAlign: 'center' }}>Clean All</Text>

                        <Row label="Close Empty Accounts" sub={`${stats.empty} accounts • ≈ ${stats.estRent} SOL`}>
                            <Switch value={close} onValueChange={setClose} />
                        </Row>

                        <Row label="Swap Dust Tokens" sub={`${stats.dust} tokens • ≈ ${stats.dustEst} SOL`}>
                            <Switch value={swap} onValueChange={setSwap} />
                        </Row>

                        {/* <Row label="Burn Worthless NFTs" sub={`${stats.spam} NFTs`}>
                            <Switch value={burn} onValueChange={setBurn} />
                        </Row> */}

                        <Pressable
                            onPress={() => onConfirm({ close, swap, burn })}
                            style={{
                                height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>CONFIRM</Text>
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
