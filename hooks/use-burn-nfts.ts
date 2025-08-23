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

type NftBurnItem = {
  mint: PublicKey
  tokenAccount?: PublicKey
}

type BurnResult = { signature: string; burned: number }

const MAX_NFTS_PER_TX = 6

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function useBurnNfts() {
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
      const ata2022 = await getAssociatedTokenAddress(
        mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
      const i2022 = await connection.getAccountInfo(ata2022, { commitment: 'processed' })
      if (i2022) return { ata: ata2022, programId: TOKEN_2022_PROGRAM_ID }

      const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
      const i = await connection.getAccountInfo(ata, { commitment: 'processed' })
      if (i) return { ata, programId: TOKEN_PROGRAM_ID }

      return { ata, programId: TOKEN_PROGRAM_ID }
    },
    [connection],
  )

  const mutateAsync = useCallback(
    async (items: NftBurnItem[]): Promise<BurnResult[]> => {
      if (!account?.publicKey) throw new Error('Wallet not connected')
      const owner = account.publicKey

      const normalized = await Promise.all(
        items.map(async (raw) => {
          let tokenAccount = raw.tokenAccount
          let programId = TOKEN_PROGRAM_ID

          if (!tokenAccount) {
            const r = await resolveAtaEitherProgram(raw.mint, owner)
            tokenAccount = r.ata
            programId = r.programId
          }

          try {
            programId = await getProgramForTokenAccount(tokenAccount!)
          } catch {
            // If no ATA exists, burn will fail safely; we still assemble tx to surface a clear error.
          }

          return { mint: raw.mint, tokenAccount: tokenAccount!, programId }
        }),
      )

      const batches = chunk(normalized, MAX_NFTS_PER_TX)
      const results: BurnResult[] = []

      for (const batch of batches) {
        const ixs = [ComputeBudgetProgram.setComputeUnitLimit({ units: 220_000 })]

        for (const it of batch) {
          // amount = 1 for standard non-compressed NFTs
          ixs.push(createBurnInstruction(it.tokenAccount, it.mint, owner, 1n, [], it.programId))
          ixs.push(createCloseAccountInstruction(it.tokenAccount, owner, owner, [], it.programId))
        }

        const tx = new Transaction().add(...ixs)
        tx.feePayer = owner

        // MWA: need recent blockhash + minContextSlot
        const {
          context: { slot: minContextSlot },
          value: { blockhash },
        } = await connection.getLatestBlockhashAndContext('processed')

        tx.recentBlockhash = blockhash

        const signature = await signAndSendTransaction(tx, minContextSlot)
        results.push({ signature, burned: batch.length })
      }

      return results
    },
    [account?.publicKey, connection, signAndSendTransaction, resolveAtaEitherProgram, getProgramForTokenAccount],
  )

  return { mutateAsync }
}
