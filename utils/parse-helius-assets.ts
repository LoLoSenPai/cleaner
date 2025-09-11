// utils/parse-helius-assets.ts
import { HeliusAsset } from '@/types/helius'

export type ParsedHeliusToken = {
  mint: string
  name: string
  symbol: string
  amount: number
  decimals: number
  image?: string
  usdValue?: number
}

export type ParsedHeliusNFT = {
  id: string
  name: string
  symbol?: string
  collection?: string
  image?: string
  jsonUri?: string
  isCompressed?: boolean
  isCore?: boolean

  // === Hints pour le burn ===
  tokenProgramAddress?: string // ex: Tokenkeg... (SPL) ou TokenzQd... (Token-2022)
  associatedTokenAddress?: string // ATA exact côté Helius
  tokenStandard?: string // 'ProgrammableNonFungible' | 'NonFungible' | ...
  frozen?: boolean
  delegated?: boolean
}

export function parseHeliusTokens(assets: HeliusAsset[]): ParsedHeliusToken[] {
  return assets
    .filter((a) => a.interface === 'FungibleToken')
    .map((a) => {
      const balance = Number(a?.token_info?.balance ?? 0)
      const decimals = Number(a?.token_info?.decimals ?? 0)
      const amount = balance / Math.pow(10, decimals)

      return {
        mint: a.id,
        name: a?.content?.metadata?.name || 'Unknown',
        symbol: a?.token_info?.symbol || a?.content?.metadata?.symbol || '',
        image: a?.content?.links?.image || undefined,
        amount,
        decimals,
        usdValue: a?.token_info?.price_info?.total_price ?? undefined,
      }
    })
}

export function parseHeliusNFTs(assets: HeliusAsset[]): ParsedHeliusNFT[] {
  return assets
    .filter((a) => a.interface !== 'FungibleToken')
    .map((a) => ({
      id: a.id,
      name: a?.content?.metadata?.name || 'Unknown NFT',
      symbol: a?.content?.metadata?.symbol || undefined,
      image: a?.content?.links?.image || undefined,
      jsonUri: a?.content?.json_uri || undefined,
      collection: a?.grouping?.find((g) => g.group_key === 'collection')?.group_value,
      isCompressed: a?.compression?.compressed ?? false,

      // hints Helius
      tokenProgramAddress: a?.token_info?.token_program || undefined,
      associatedTokenAddress: a?.token_info?.associated_token_address || undefined,
      tokenStandard: a?.content?.metadata?.token_standard || undefined,
      isCore: a?.interface === 'MplCoreAsset',
      frozen: !!a?.ownership?.frozen,
      delegated: !!a?.ownership?.delegated,
    }))
}
