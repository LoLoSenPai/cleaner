// hooks/use-close-empty-accounts.ts
import { useCallback, useMemo, useState } from 'react'
import { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createCloseAccountInstruction } from '@solana/spl-token'
import { useConnection } from '@/components/solana/solana-provider'
import { useWalletUi } from '@/components/solana/use-wallet-ui'
import { useGetTokenAccounts, useGetTokenAccountsInvalidate } from '@/components/account/use-get-token-accounts'

export function useCloseEmptyAccounts(owner: PublicKey | undefined) {
  const connection = useConnection()
  const { signAndSendTransaction } = useWalletUi()

  const { data: tokenAccounts } = useGetTokenAccounts({ address: owner! })
  const invalidateTokenAccounts = useGetTokenAccountsInvalidate({ address: owner! })

  // UI-only count (fast, from cache)
  const emptyCount = useMemo(() => {
    if (!tokenAccounts || !owner) return 0
    const owner58 = owner.toBase58()
    return tokenAccounts.filter((acc) => {
      const info = acc.account.data.parsed.info
      return (info.tokenAmount?.amount ?? '0') === '0' && !info.isNative && (info.owner ?? '') === owner58
    }).length
  }, [tokenAccounts, owner])

  const [busy, setBusy] = useState(false)
  const [closed, setClosed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Fresh fetch from RPC (both programs)
  const fetchEmptyNow = useCallback(async (): Promise<{ pubkey: PublicKey; programId: PublicKey }[]> => {
    if (!owner) return []
    const [tok, tok22] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, 'processed'),
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }, 'processed'),
    ])
    const all = [
      ...tok.value.map((v) => ({ pubkey: v.pubkey, acc: v.account, programId: TOKEN_PROGRAM_ID })),
      ...tok22.value.map((v) => ({ pubkey: v.pubkey, acc: v.account, programId: TOKEN_2022_PROGRAM_ID })),
    ]
    const out: { pubkey: PublicKey; programId: PublicKey }[] = []
    for (const { pubkey, acc, programId } of all) {
      const info = (acc.data as any).parsed?.info
      const amount = info?.tokenAmount?.amount ?? '0'
      const isNative = info?.isNative ?? false
      const owner58 = info?.owner ?? ''
      if (amount === '0' && !isNative && owner58 === owner.toBase58()) {
        out.push({ pubkey, programId })
      }
    }
    return out
  }, [connection, owner])

  const run = useCallback(async () => {
    if (!owner) return { closed: 0 }
    setBusy(true)
    setError(null)
    setClosed(0)
    try {
      // **fresh** list at the moment we execute
      const empties = await fetchEmptyNow()
      if (empties.length === 0) return { closed: 0 }

      const latest = await connection.getLatestBlockhash()
      const ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ...empties.map(({ pubkey, programId }) => createCloseAccountInstruction(pubkey, owner, owner, [], programId)),
      ]

      const msg = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: latest.blockhash,
        instructions: ixs,
      }).compileToV0Message()

      const tx = new VersionedTransaction(msg)
      const sig = await signAndSendTransaction(tx, 0)
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed')

      setClosed(empties.length)
      await invalidateTokenAccounts()
      return { closed: empties.length, sig }
    } catch (e: any) {
      const m = String(e?.message ?? e)
      setError(m)
      return { closed: 0, error: m }
    } finally {
      setBusy(false)
    }
  }, [owner, fetchEmptyNow, connection, signAndSendTransaction, invalidateTokenAccounts])

  return { emptyCount, run, busy, closed, error }
}
