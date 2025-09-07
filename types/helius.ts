// types/helius.ts
export type HeliusAsset = {
    id: string
    interface: string
    content?: {
        metadata?: {
            name?: string
            symbol?: string
            decimals?: number
        }
        links?: {
            image?: string
        }
        json_uri?: string
    }
    ownership?: {
        amount?: string
    }
    grouping?: {
        group_key: string
        group_value: string
    }[]
    token_info?: {
        balance?: number
        decimals?: number
        symbol?: string
        price_info?: {
            price_per_token?: number
            total_price?: number
            currency?: string
        }
    }
    compression?: {
        compressed?: boolean
    }
}
