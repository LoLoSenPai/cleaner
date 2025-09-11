// utils/build-legacy-tx.ts
import { Transaction, ComputeBudgetProgram, PublicKey, TransactionInstruction } from '@solana/web3.js'

export async function buildLegacyTx(params: {
  payer: PublicKey
  ixs: TransactionInstruction[]
  getBlockhash: () => Promise<{ blockhash: string; minContextSlot: number }>
}) {
  const { payer, ixs, getBlockhash } = params
  const { blockhash, minContextSlot } = await getBlockhash()

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ...ixs,
  )
  tx.feePayer = payer
  tx.recentBlockhash = blockhash

  return { tx, minContextSlot }
}
