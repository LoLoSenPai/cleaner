import { Cluster } from '@/components/cluster/cluster'
import { ClusterNetwork } from '@/components/cluster/cluster-network'
import { clusterApiUrl } from '@solana/web3.js'

export class AppConfig {
  static name = 'cleaner'
  static uri = 'https://example.com'
  static clusters: Cluster[] = [
    {
      id: 'solana:mainnet',
      name: 'Mainnet',
      endpoint: 'https://mainnet.helius-rpc.com/?api-key=7f5873cc-6ba8-4366-9ab9-3f2ea38e5e29',
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
