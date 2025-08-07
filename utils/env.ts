import Constants from 'expo-constants'

export const HELIUS_API_KEY = Constants?.expoConfig?.extra?.HELIUS_API_KEY
export const HELIUS_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`