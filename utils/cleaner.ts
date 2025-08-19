import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    createCloseAccountInstruction,
} from '@solana/spl-token'
import {
    PublicKey,
    ComputeBudgetProgram,
    TransactionMessage,
    VersionedTransaction,
    Connection,
} from '@solana/web3.js'
import type { AccountInfo, ParsedAccountData } from '@solana/web3.js'

export type TokenAcc = { pubkey: PublicKey; account: AccountInfo<ParsedAccountData> }

/** Filtre local: pas besoin de connection */
export function findEmptyTokenAccounts(owner: PublicKey, allAccounts: TokenAcc[]): TokenAcc[] {
    return allAccounts.filter((acc) => {
        const info = acc.account.data.parsed.info
        const amount = info.tokenAmount?.amount || '0'
        const isNative = info.isNative || false
        const accOwner = info.owner || ''
        return amount === '0' && !isNative && accOwner === owner.toBase58()
    })
}

/** Simule pour ne garder que les fermetures valides */
export async function simulateClosable(
    connection: Connection,
    owner: PublicKey,
    empties: TokenAcc[],
): Promise<TokenAcc[]> {
    const { blockhash } = await connection.getLatestBlockhash()
    const valid: TokenAcc[] = []
    for (const acc of empties) {
        const programId = acc.account.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
        const ix = createCloseAccountInstruction(acc.pubkey, owner, owner, [], programId)
        const msg = new TransactionMessage({
            payerKey: owner,
            recentBlockhash: blockhash,
            instructions: [ix],
        }).compileToV0Message()
        const tx = new VersionedTransaction(msg)
        const sim = await connection.simulateTransaction(tx)
        if (!sim.value.err) valid.push(acc)
    }
    return valid
}

/** Ferme en batch et confirme */
export async function closeEmptyAccountsBatch(
    connection: Connection,
    owner: PublicKey,
    closable: TokenAcc[],
    // Adapter compatible avec ton signAndSendTransaction(tx, minContextSlot)
    signAndSend: (tx: VersionedTransaction, minContextSlot?: number) => Promise<string>,
) {
    if (!closable.length) return null
    const latest = await connection.getLatestBlockhash()

    const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ...closable.map(({ pubkey, account }) => {
            const programId = account.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
            return createCloseAccountInstruction(pubkey, owner, owner, [], programId)
        }),
    ]

    const msg = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: latest.blockhash,
        instructions,
    }).compileToV0Message()

    const tx = new VersionedTransaction(msg)
    const sig = await signAndSend(tx, 0)
    await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed')
    return sig
}
