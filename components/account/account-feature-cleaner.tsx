import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'
import { useConnection } from '@/components/solana/solana-provider'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { Button } from '@react-navigation/elements'
import {
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import { AccountInfo, ComputeBudgetProgram, ParsedAccountData, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native'
import { useGetTokenAccounts, useGetTokenAccountsInvalidate } from './use-get-token-accounts'

const RENT_RECOVERED_PER_ACCOUNT = 0.00203928

export function AccountFeatureCleaner({ address }: { address: PublicKey }) {
    const connection = useConnection()
    const [isSimulating, setIsSimulating] = useState(true)
    const { signAndSendTransaction } = useWalletUi()
    const invalidate = useGetTokenAccountsInvalidate({ address })

    const { data: tokenAccounts, isLoading, isRefetching } = useGetTokenAccounts({ address })
    const [isClosing, setIsClosing] = useState(false)
    const [closableAccounts, setClosableAccounts] = useState<
        { pubkey: PublicKey; account: AccountInfo<ParsedAccountData> }[]
    >([])

    const emptyAccounts = useMemo(() => {
        return (
            tokenAccounts?.filter((acc) => {
                const info = acc.account.data.parsed.info
                const amount = info.tokenAmount?.amount || '0'
                const isNative = info.isNative || false
                const owner = info.owner || ''

                return (
                    amount === '0' &&
                    !isNative &&
                    owner === address.toBase58()
                )
            }) ?? []
        )
    }, [tokenAccounts, address])

    const totalReclaim = useMemo(() => {
        return (closableAccounts.length * RENT_RECOVERED_PER_ACCOUNT).toFixed(4)
    }, [closableAccounts.length])

    // ✅ Simule chaque fermeture pour ne garder que les valides
    useEffect(() => {
        if (!emptyAccounts.length) {
            setClosableAccounts([])
            setIsSimulating(false)
            return
        }

        const simulateAll = async () => {
            setIsSimulating(true)
            const blockhash = await connection.getLatestBlockhash()
            const valid: typeof tokenAccounts = []

            for (const acc of emptyAccounts) {
                try {
                    const programId = acc.account.owner.equals(TOKEN_2022_PROGRAM_ID)
                        ? TOKEN_2022_PROGRAM_ID
                        : TOKEN_PROGRAM_ID

                    const ix = createCloseAccountInstruction(acc.pubkey, address, address, [], programId)
                    const msg = new TransactionMessage({
                        payerKey: address,
                        recentBlockhash: blockhash.blockhash,
                        instructions: [ix],
                    }).compileToV0Message()

                    const tx = new VersionedTransaction(msg)
                    const sim = await connection.simulateTransaction(tx)

                    if (!sim.value.err) {
                        valid.push(acc)
                    } else {
                        console.log('⛔️ Simulation failed for', acc.pubkey.toBase58(), acc.account.data.parsed.info)
                    }
                } catch (e) {
                    console.log('⚠️ Simulation error on', acc.pubkey.toBase58())
                }
            }

            setClosableAccounts(valid)
            setIsSimulating(false)
        }

        simulateAll()
    }, [emptyAccounts, address, connection])

    const handleClose = useCallback(async () => {
        if (!closableAccounts.length) return

        setIsClosing(true)

        try {
            const latest = await connection.getLatestBlockhash()

            const instructions = [
                ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
                ...closableAccounts.map(({ pubkey, account }) => {
                    const programId = account.owner.equals(TOKEN_2022_PROGRAM_ID)
                        ? TOKEN_2022_PROGRAM_ID
                        : TOKEN_PROGRAM_ID

                    return createCloseAccountInstruction(pubkey, address, address, [], programId)
                }),
            ]

            const messageV0 = new TransactionMessage({
                payerKey: address,
                recentBlockhash: latest.blockhash,
                instructions,
            }).compileToV0Message()

            const tx = new VersionedTransaction(messageV0)

            const signature = await signAndSendTransaction(tx, 0)
            await connection.confirmTransaction({ signature, ...latest }, 'confirmed')

            console.log(`✅ Closed ${closableAccounts.length} accounts, tx: ${signature}`)
            await invalidate()
        } catch (err) {
            console.warn('❌ Failed to close accounts:', err)
        } finally {
            setIsClosing(false)
        }
    }, [closableAccounts, address, connection, signAndSendTransaction, invalidate])

    return (
        <AppView style={{ gap: 16 }}>
            <AppText type="subtitle" style={{ color: '#fff' }}>Wallet Cleaner</AppText>

            {isLoading || isRefetching || isSimulating ? (
                <ActivityIndicator />
            ) : closableAccounts.length === 0 ? (
                <AppText style={{ color: '#fff' }}>No empty token accounts found ✅</AppText>
            ) : (
                <>
                    <AppText style={{ color: '#fff' }}>
                        {closableAccounts.length} empty accounts can be closed
                    </AppText>
                    <AppText style={{ color: '#fff' }}>
                        Estimated reclaimed rent: ~{totalReclaim} SOL
                    </AppText>

                    <LinearGradient
                        colors={['#3B82F6', '#22D3EE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.btnGradient}
                    >
                        <Pressable
                            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                            style={[styles.btnInner, isClosing && styles.btnInnerDisabled]}
                            onPress={handleClose}
                            disabled={isClosing}
                        >
                            <Text style={styles.btnText}>
                                {isClosing ? 'Closing...' : 'Close Empty Accounts'}
                            </Text>
                        </Pressable>
                    </LinearGradient>
                </>
            )}
        </AppView>
    )
}

const styles = StyleSheet.create({
    btnGradient: {
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 28,
        padding: 2,
        shadowColor: '#22D3EE',
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    btnInner: {
        borderRadius: 26,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    btnInnerDisabled: {
        opacity: 0.6,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
})