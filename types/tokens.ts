export type TokenInfo = {
    mint: string;
    address: string;
    decimals: number;
    logoURI: string;
    name: string;
    symbol: string;
    amount?: number;
    balance?: number;
    usdValue?: number;
}