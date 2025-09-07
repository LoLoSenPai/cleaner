// resolve-sgt.mjs
import { Connection, PublicKey } from '@solana/web3.js'

const RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com'
const METADATA_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te' // ← remplace par la tienne

const ipfsToHttp = (u) => (u?.startsWith('ipfs://') ? u.replace('ipfs://', 'https://ipfs.io/ipfs/') : u)

function extractUriFromBytes(u8) {
  const needles = [
    new TextEncoder().encode('https://'),
    new TextEncoder().encode('http://'),
    new TextEncoder().encode('ipfs://'),
  ]
  const isPrintable = (b) => b >= 0x20 && b <= 0x7e
  // find first occurrence of any needle
  let start = -1
  for (const n of needles) {
    for (let i = 0; i <= u8.length - n.length; i++) {
      let ok = true
      for (let j = 0; j < n.length; j++)
        if (u8[i + j] !== n[j]) {
          ok = false
          break
        }
      if (ok) {
        start = i
        break
      }
    }
    if (start !== -1) break
  }
  if (start === -1) return undefined
  // read forward until non-printable / quote / space
  const bytes = []
  for (let k = start; k < u8.length; k++) {
    const b = u8[k]
    if (!isPrintable(b) || b === 0x22 /*"*/ || b === 0x27 /*'*/ || b === 0x20 /*space*/) break
    bytes.push(b)
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

const connection = new Connection(RPC, 'confirmed')
const info = await connection.getAccountInfo(new PublicKey(METADATA_ADDRESS))
if (!info?.data) {
  console.log('No metadata account data found')
  process.exit(0)
}

const uriRaw = extractUriFromBytes(new Uint8Array(info.data))
console.log('metadata URI:', uriRaw)
if (!uriRaw) process.exit(0)

const metaRes = await fetch(ipfsToHttp(uriRaw))
if (!metaRes.ok) {
  console.log('metadata fetch failed with status', metaRes.status)
  process.exit(0)
}
const metaJson = await metaRes.json()
const img = metaJson?.image ?? metaJson?.image_url ?? metaJson?.properties?.image
const imgUrl = ipfsToHttp(String(img ?? ''))
console.log('image URL:', imgUrl)
