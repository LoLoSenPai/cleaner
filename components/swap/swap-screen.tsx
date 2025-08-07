// SwapScreen.tsx
import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Button,
    TouchableOpacity,
    Image,
    Modal,
    FlatList,
} from 'react-native'
import { useTokenList } from '@/hooks/use-token-list'
import { TokenInfo } from '@/types/tokens'
import { useQuote } from '@/hooks/useQuote'

const TokenInputRow = ({
    label,
    token,
    amount,
    onAmountChange,
    onTokenPress,
}: {
    label: string
    token: TokenInfo | null
    amount: string
    onAmountChange: (val: string) => void
    onTokenPress: () => void
}) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{ color: 'white', marginBottom: 4 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
                onPress={onTokenPress}
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#1c1c1e',
                    padding: 10,
                    borderRadius: 20,
                }}
            >
                {token?.logoURI && (
                    <Image
                        source={{ uri: token.logoURI }}
                        style={{ width: 24, height: 24, marginRight: 8 }}
                    />
                )}
                <Text style={{ color: 'white' }}>{token?.symbol || 'Select'}</Text>
            </TouchableOpacity>

            <TextInput
                value={amount}
                onChangeText={onAmountChange}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#666"
                style={{
                    color: 'white',
                    borderColor: '#555',
                    borderWidth: 1,
                    padding: 10,
                    marginLeft: 10,
                    minWidth: 80,
                    textAlign: 'right',
                    borderRadius: 8,
                }}
            />
        </View>
    </View>
)

const SwapScreen = () => {
    const tokenList = useTokenList()
    const [fromToken, setFromToken] = useState<TokenInfo | null>(null)
    const [toToken, setToToken] = useState<TokenInfo | null>(null)
    const [amount, setAmount] = useState<string>('')
    const [modalVisible, setModalVisible] = useState(false)
    const [selectingFor, setSelectingFor] = useState<'from' | 'to'>('from')
    const quote = useQuote(fromToken?.address, toToken?.address, amount, fromToken?.decimals)

    useEffect(() => {
        if (tokenList.length && !fromToken && !toToken) {
            const usdc = tokenList.find(t => t.symbol === 'USDC')
            const sol = tokenList.find(t => t.symbol === 'SOL')
            if (usdc && sol) {
                setFromToken(usdc)
                setToToken(sol)
            }
        }
    }, [tokenList])

    const onTokenPress = (type: 'from' | 'to') => {
        setSelectingFor(type)
        setModalVisible(true)
    }

    const onSelectToken = (token: TokenInfo) => {
        if (selectingFor === 'from') setFromToken(token)
        else setToToken(token)
        setModalVisible(false)
    }

    // useEffect(() => {
    //     console.log('🔁 fromToken', fromToken?.symbol, fromToken?.decimals)
    //     console.log('🔁 toToken', toToken?.symbol, toToken?.decimals)
    //     console.log('💰 quote', quote)
    // }, [fromToken, toToken, quote])

    return (
        <View style={{ padding: 16, backgroundColor: 'black', flex: 1 }}>
            <TokenInputRow
                label="You pay"
                token={fromToken}
                amount={amount}
                onAmountChange={setAmount}
                onTokenPress={() => onTokenPress('from')}
            />

            <TouchableOpacity
                onPress={() => {
                    setFromToken(toToken)
                    setToToken(fromToken)
                }}
                style={{
                    alignSelf: 'center',
                    backgroundColor: '#1c1c1e',
                    padding: 8,
                    borderRadius: 20,
                    marginVertical: 12,
                }}
            >
                <Text style={{ color: 'white' }}>⇅</Text>
            </TouchableOpacity>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ color: 'white', marginBottom: 4 }}>You receive</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => onTokenPress('to')}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#1c1c1e',
                            padding: 10,
                            borderRadius: 20,
                        }}
                    >
                        {toToken?.logoURI && (
                            <Image
                                source={{ uri: toToken.logoURI }}
                                style={{ width: 24, height: 24, marginRight: 8 }}
                            />
                        )}
                        <Text style={{ color: 'white' }}>{toToken?.symbol || 'Select'}</Text>
                    </TouchableOpacity>

                    <View
                        style={{
                            borderColor: '#555',
                            borderWidth: 1,
                            padding: 10,
                            marginLeft: 10,
                            minWidth: 80,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: 'gray', textAlign: 'right' }}>
                            ~{quote && toToken?.decimals != null
                                ? (Number(quote.outAmount) / 10 ** toToken.decimals).toFixed(4)
                                : '0.00'}
                        </Text>
                    </View>
                </View>
            </View>

            <Button title="SWAP" disabled={!fromToken || !toToken || !amount} onPress={() => { }} />

            {quote && fromToken && toToken && (
                <View style={{ marginTop: 16, padding: 12, backgroundColor: '#1e1e1e', borderRadius: 12 }}>
                    <Text style={{ color: 'white', marginBottom: 4 }}>
                        1 {fromToken.symbol} ≈ {(
                            (Number(quote.outAmount) / 10 ** toToken.decimals) /
                            (Number(amount) || 1)
                        ).toFixed(6)} {toToken.symbol}
                    </Text>

                    <View style={{ marginTop: 8 }}>
                        <Text style={{ color: 'white', marginBottom: 4 }}>Routes:</Text>
                        {quote.routePlan.map((step, idx) => (
                            <View key={idx} style={{ marginBottom: 4 }}>
                                <Text style={{ color: 'gray' }}>
                                    • {step.swapInfo.label || step.swapInfo.amm} —{' '}
                                    {step.percent}% of swap
                                </Text>
                            </View>
                        ))}
                    </View>

                    {quote.priceImpactPct && (
                        <Text
                            style={{
                                color:
                                    parseFloat(quote.priceImpactPct) > 0.02
                                        ? 'red'
                                        : parseFloat(quote.priceImpactPct) > 0.01
                                            ? 'orange'
                                            : 'green',
                            }}
                        >
                            Price impact: {(parseFloat(quote.priceImpactPct) * 100).toFixed(2)}%
                        </Text>
                    )}

                    {quote.swapUsdValue && (
                        <Text style={{ color: 'gray' }}>
                            Est. value: ${parseFloat(quote.swapUsdValue).toFixed(2)}
                        </Text>
                    )}
                </View>
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'black', padding: 16 }}>
                    <FlatList
                        data={tokenList}
                        keyExtractor={item => item.address}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => onSelectToken(item)}
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
                            >
                                <Image source={{ uri: item.logoURI }} style={{ width: 24, height: 24, marginRight: 8 }} />
                                <Text style={{ color: 'white' }}>{item.symbol}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    )
}

export default SwapScreen
