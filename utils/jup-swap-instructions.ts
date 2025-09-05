// utils/jup-swap-instructions.ts
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

/** Shape returned by Jupiter /swap-instructions */
export type JupIxAccount = string | { pubkey: string; isSigner?: boolean; isWritable?: boolean }

export type JupIx = {
  programId: string
  accounts: JupIxAccount[]
  data: string // base64
}

export type JupSwapIxResponse = {
  // sometimes `cleanupInstruction`, sometimes `cleanupInstructions`
  swapInstruction: JupIx
  setupInstructions?: JupIx[]
  cleanupInstruction?: JupIx
  cleanupInstructions?: JupIx[]
  // LUTs needed to compile a v0 message
  addressLookupTableAddresses?: string[]
}

function toTxIx(ix: JupIx): TransactionInstruction {
  const programId = new PublicKey(ix.programId)
  const keys = ix.accounts.map((a: JupIxAccount) => {
    if (typeof a === 'string') {
      return { pubkey: new PublicKey(a), isSigner: false, isWritable: false }
    }
    return {
      pubkey: new PublicKey(a.pubkey),
      isSigner: !!a.isSigner,
      isWritable: !!a.isWritable,
    }
  })
  const data = Buffer.from(ix.data, 'base64')
  return new TransactionInstruction({ programId, keys, data })
}

export function jupToTxIxs(resp: JupSwapIxResponse): {
  setup: TransactionInstruction[]
  swap: TransactionInstruction
  cleanup: TransactionInstruction[]
  luts: string[]
} {
  const setup = (resp.setupInstructions ?? []).map(toTxIx)
  const swap = toTxIx(resp.swapInstruction)
  const cleanupArr = resp.cleanupInstructions ?? (resp.cleanupInstruction ? [resp.cleanupInstruction] : [])
  const cleanup = cleanupArr.map(toTxIx)
  const luts = resp.addressLookupTableAddresses ?? []
  return { setup, swap, cleanup, luts }
}

/** Call Jupiter `/swap-instructions` with wrapAndUnwrapSol=false (we do one cleanup at the end) */
export async function fetchSwapInstructions(params: {
  quoteResponse: any
  userPublicKey: string
  useSharedAccounts?: boolean
}): Promise<JupSwapIxResponse> {
  const res = await fetch('https://lite-api.jup.ag/swap/v1/swap-instructions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: false, 
      useSharedAccounts: params.useSharedAccounts ?? true,
      dynamicComputeUnitLimit: false, 
    }),
  })
  if (!res.ok) throw new Error(`swap-instructions ${res.status}`)
  return (await res.json()) as JupSwapIxResponse
}
