// utils/debug-nft.ts
import { Connection, PublicKey } from '@solana/web3.js'
import {
  getAccount as getTokenAccount,
  getMint as getTokenMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

export async function debugWhyBurnFails(connection: Connection, owner: PublicKey, mint: PublicKey, ata: PublicKey) {
  const ai = await connection.getAccountInfo(ata, { commitment: 'processed' })
  if (!ai) return { ok: false, reason: 'ATA missing' }

  const program = ai.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? 'Token-2022'
    : ai.owner.equals(TOKEN_PROGRAM_ID)
      ? 'SPL'
      : '??'

  const acc = await getTokenAccount(connection, ata, 'processed')
  const mintInfo = await getTokenMint(connection, mint, 'processed')

  const reasons: string[] = []
  if (!acc.owner.equals(owner)) reasons.push('ATA owner mismatch')
  if (acc.amount === 0n) reasons.push('balance = 0')
  if (acc.isFrozen) reasons.push('account frozen')
  if (acc.delegate) reasons.push('has delegate (revoke first)')
  if (mintInfo.mintAuthority !== null && mintInfo.supply !== 1n) reasons.push('not NFT: supply != 1')

  return {
    ok: reasons.length === 0,
    program,
    amount: acc.amount.toString(),
    decimals: mintInfo.decimals,
    isFrozen: acc.isFrozen,
    hasDelegate: !!acc.delegate,
    reasons,
  }
}
