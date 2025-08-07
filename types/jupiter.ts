export type SwapInfo = {
    amm: string
    label?: string
    inputMint: string
    outputMint: string
    inAmount: string
    outAmount: string
    feeAmount: string
    feeMint: string
}

export type RouteStep = {
    swapInfo: SwapInfo
    percent: number
    bps: number
}

export type QuoteResponse = {
    outAmount: string
    otherAmountThreshold: string
    priceImpactPct: string
    routePlan: RouteStep[]
    contextSlot: number
    timeTaken: number
    swapUsdValue?: string
}