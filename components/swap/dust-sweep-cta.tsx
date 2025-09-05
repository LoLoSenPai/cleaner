import React, { useEffect, useState } from 'react'
import { View, Image, Pressable } from 'react-native'
import { Card } from '@/components/ui/card'
import { AppText } from '@/components/app-text'
import { BaseButton } from '@/components/solana/base-button'
import { useDustSwap } from '@/hooks/use-dust-swap'

const THRESHOLDS = [1, 2, 5, 10, 20, 50] as const

export default function DustSweepCTA() {
    const defaultThreshold = THRESHOLDS.includes(1 as any) ? 1 : THRESHOLDS[0]
    const [threshold, setThreshold] = useState<number>(defaultThreshold)

    const { preview, skipped, loading, busy, refresh, swapAllBelowUsd, lastRun } = useDustSwap()

    useEffect(() => {
        refresh(threshold)
    }, [threshold, refresh])

    const hasDust = preview.length > 0

    return (
        <Card>
            <View style={{ padding: 16, gap: 12 }}>
                <AppText type="subtitle" style={{ color: '#fff' }}>
                    Dust sweep (&lt;${threshold})
                </AppText>

                {/* Threshold chips */}
                <View style={{ gap: 8 }}>
                    <AppText style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                        Max per token
                    </AppText>
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            padding: 8,
                            borderRadius: 10,
                        }}
                    >
                        {THRESHOLDS.map((v) => {
                            const selected = v === threshold
                            return (
                                <Pressable
                                    key={String(v)}
                                    onPress={() => !busy && !loading && setThreshold(v)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        backgroundColor: selected ? 'rgba(255,255,255,0.18)' : 'transparent',
                                        borderWidth: selected ? 1 : 0,
                                        borderColor: 'rgba(255,255,255,0.25)',
                                    }}
                                >
                                    <AppText style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: '700' }}>
                                        ${v}
                                    </AppText>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>

                {/* List */}
                {loading ? (
                    <AppText>Loading…</AppText>
                ) : hasDust ? (
                    <View style={{ gap: 8 }}>
                        {preview.map((p) => (
                            <View
                                key={p.mint}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 6,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {!!p.logoURI && (
                                        <Image source={{ uri: p.logoURI }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                                    )}
                                    <AppText style={{ fontWeight: '700', color: '#fff' }}>{p.symbol}</AppText>
                                </View>
                                <AppText style={{ color: 'rgba(255,255,255,0.8)' }}>~${p.usdEst.toFixed(2)}</AppText>
                            </View>
                        ))}
                    </View>
                ) : null}

                {skipped.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                        <AppText style={{ color: 'rgba(255,255,255,0.6)' }}>
                            Temporarily skipped: {skipped.length}{' '}
                            <AppText style={{ color: 'rgba(255,255,255,0.45)' }}>
                                (e.g. {skipped[0].symbol}: {skipped[0].reason})
                            </AppText>
                        </AppText>
                    </View>
                )}

                <BaseButton
                    variant="gradient"
                    size="lg"
                    fullWidth
                    iconName="arrow.2.squarepath"
                    label={hasDust ? `Swap dust to SOL (${preview.length})` : `No dust under $${threshold}`}
                    disabled={!hasDust || loading || busy}
                    onPress={async () => {
                        await swapAllBelowUsd(threshold)
                    }}
                />

                {/* {lastRun && (
                    <View style={{ marginTop: 8, gap: 6 }}>
                        <AppText style={{ color: '#fff', fontWeight: '700' }}>
                            Done: {lastRun.ok.length} • Failed: {lastRun.fail.length}
                        </AppText>
                        {lastRun.fail.slice(0, 5).map((f) => (
                            <AppText key={f.mint} style={{ color: 'rgba(255,255,255,0.75)' }}>
                                • {f.symbol}: {f.reason}
                            </AppText>
                        ))}
                    </View>
                )} */}
            </View>
        </Card>
    )
}
