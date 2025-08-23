import { useCallback } from 'react'
import { PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useConnection } from '@/components/solana/solana-provider'

type BurnTokenItem =
  | {
      mint: PublicKey
      tokenAccount?: PublicKey
      amountBase: bigint | 'ALL'
    }
  | {
      mint: PublicKey
      tokenAccount?: PublicKey
      amountUi: string | number // e.g. '1.23'
      decimals: number
    }

type BurnResult = { signature: string; burned: number }

const MAX_ITEMS_PER_TX = 5

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function toBaseUnits(amountUi: string | number, decimals: number): bigint {
  // Exact decimal to bigint (no float rounding)
  const s = String(amountUi)
  const [i, f = ''] = s.split('.')
  const frac = f.padEnd(decimals, '0').slice(0, decimals)
  const full = (i === '' ? '0' : i) + frac
  return BigInt(full)
}

export function useBurnTokens() {
  const { account, signAndSendTransaction } = useWalletUi()
  const connection = useConnection()

  const getProgramForTokenAccount = useCallback(
    async (tokenAccount: PublicKey) => {
      const info = await connection.getAccountInfo(tokenAccount, { commitment: 'processed' })
      if (!info) throw new Error(`Token account not found: ${tokenAccount.toBase58()}`)
      return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    },
    [connection],
  )

  const resolveAtaEitherProgram = useCallback(
    async (mint: PublicKey, owner: PublicKey) => {
      // Try ATA for Token-2022
      const ata2022 = await getAssociatedTokenAddress(
        mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
      const i2022 = await connection.getAccountInfo(ata2022, { commitment: 'processed' })
      if (i2022) return { ata: ata2022, programId: TOKEN_2022_PROGRAM_ID }

      // Fallback: Token (legacy)
      const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
      const i = await connection.getAccountInfo(ata, { commitment: 'processed' })
      if (i) return { ata, programId: TOKEN_PROGRAM_ID }

      // Neither exists: default to Token (most common); program will be read later if account is provided
      return { ata, programId: TOKEN_PROGRAM_ID }
    },
    [connection],
  )

  const resolveAmountBase = useCallback(
    async (tokenAccount: PublicKey, requested: bigint | 'ALL' | undefined) => {
      if (requested && requested !== 'ALL') return requested
      const bal = await connection.getTokenAccountBalance(tokenAccount, 'processed')
      return BigInt(bal.value.amount)
    },
    [connection],
  )

  const mutateAsync = useCallback(
    async (items: BurnTokenItem[]): Promise<BurnResult[]> => {
      if (!account?.publicKey) throw new Error('Wallet not connected')
      const owner = account.publicKey

      // Normalize inputs (resolve tokenAccount, programId, amountBase)
      const normalized = await Promise.all(
        items.map(async (raw) => {
          const mint = raw.mint
          let tokenAccount = 'tokenAccount' in raw && raw.tokenAccount ? raw.tokenAccount : undefined
          let programId = TOKEN_PROGRAM_ID

          if (!tokenAccount) {
            const r = await resolveAtaEitherProgram(mint, owner)
            tokenAccount = r.ata
            programId = r.programId
          }

          // If the account exists, trust its owner
          try {
            programId = await getProgramForTokenAccount(tokenAccount!)
          } catch {
            // If ATA not created yet, we will still attempt burn; spl-token will fail safely.
          }

          let amountBase: bigint
          if ('amountBase' in raw) {
            amountBase = await resolveAmountBase(tokenAccount!, raw.amountBase)
          } else {
            amountBase = toBaseUnits(raw.amountUi, raw.decimals)
          }

          return { mint, tokenAccount: tokenAccount!, amountBase, programId }
        }),
      )

      const batches = chunk(normalized, MAX_ITEMS_PER_TX)
      const results: BurnResult[] = []

      for (const batch of batches) {
        const ixs = [ComputeBudgetProgram.setComputeUnitLimit({ units: 220_000 })]

        for (const it of batch) {
          // amount = 1 for standard non-compressed NFTs (or use it.amountBase for tokens)
          ixs.push(createBurnInstruction(it.tokenAccount, it.mint, owner, it.amountBase, [], it.programId))
          ixs.push(createCloseAccountInstruction(it.tokenAccount, owner, owner, [], it.programId))
        }

        // Build transaction
        const tx = new Transaction().add(...ixs)
        tx.feePayer = owner

        // Get recent blockhash + minContextSlot for MWA
        const {
          context: { slot: minContextSlot },
          value: { blockhash },
        } = await connection.getLatestBlockhashAndContext('processed')

        tx.recentBlockhash = blockhash

        // MWA requires (tx, minContextSlot)
        const signature = await signAndSendTransaction(tx, minContextSlot)
        results.push({ signature, burned: batch.length })
      }

      return results
    },
    [account?.publicKey, connection, signAndSendTransaction, resolveAtaEitherProgram, getProgramForTokenAccount, resolveAmountBase],
  )

  return { mutateAsync }
}
