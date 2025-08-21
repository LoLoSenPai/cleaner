import { Cluster } from '@/components/cluster/cluster'
import { ClusterNetwork } from '@/components/cluster/cluster-network'
import { clusterApiUrl } from '@solana/web3.js'
import { HELIUS_ENDPOINT } from '@/utils/env'

export class AppConfig {
  static name = 'Wallet Cleaner'
  static uri = 'https://example.com'
  public static readonly icon = '../assets/splash/icon.png'
  static siws = {
    statement: 'Sign in to Wallet Cleaner',
  }
  static clusters: Cluster[] = [
    {
      id: 'solana:mainnet',
      name: 'Mainnet',
      endpoint: HELIUS_ENDPOINT,
      network: ClusterNetwork.Mainnet,
    },
    {
      id: 'solana:devnet',
      name: 'Devnet',
      endpoint: clusterApiUrl('devnet'),
      network: ClusterNetwork.Devnet,
    },
    {
      id: 'solana:testnet',
      name: 'Testnet',
      endpoint: clusterApiUrl('testnet'),
      network: ClusterNetwork.Testnet,
    },
  ]
}
