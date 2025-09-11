// types/helius.ts
export type HeliusAsset = {
  id: string
  interface: string

  content?: {
    metadata?: {
      name?: string
      symbol?: string
      decimals?: number
      // pNFT vs NFT standard
      token_standard?: 'NonFungible' | 'ProgrammableNonFungible' | string
    }
    links?: {
      image?: string
      animation_url?: string
    }
    json_uri?: string
  }

  ownership?: {
    owner?: string
    amount?: string
    // hints utiles pour burn
    frozen?: boolean
    delegated?: boolean
    delegate?: string | null
    ownership_model?: string
  }

  grouping?: {
    group_key: string
    group_value: string
  }[]

  token_info?: {
    balance?: number
    decimals?: number
    symbol?: string
    supply?: number
    // programme du mint (SPL vs Token-2022)
    token_program?: string
    // ATA calculé par Helius
    associated_token_address?: string
    price_info?: {
      price_per_token?: number
      total_price?: number
      currency?: string
    }
  }

  compression?: {
    compressed?: boolean
    eligible?: boolean
    data_hash?: string
    creator_hash?: string
    asset_hash?: string
    tree?: string
    seq?: number
    leaf_id?: number
  }

  // champs annexes parfois présents
  creators?: { address: string; share: number; verified: boolean }[]
  royalty?: {
    royalty_model?: string
    target?: string | null
    percent?: number
    basis_points?: number
    primary_sale_happened?: boolean
    locked?: boolean
  }
}
