// utils/resolve-nft-meta.ts
import { Connection, PublicKey } from '@solana/web3.js'

export type ResolvedNftMeta = {
  image?: string
  name?: string
  symbol?: string
  animationUrl?: string
  jsonUri?: string
}

const ipfsToHttp = (u?: string) => (u && u.startsWith('ipfs://') ? u.replace('ipfs://', 'https://ipfs.io/ipfs/') : u)

function extractUriFromBytes(u8: Uint8Array): string | undefined {
  const needles = ['https://', 'http://', 'ipfs://'].map((s) => new TextEncoder().encode(s))
  const isPrintable = (b: number) => b >= 0x20 && b <= 0x7e
  let start = -1
  for (const n of needles) {
    outer: for (let i = 0; i <= u8.length - n.length; i++) {
      for (let j = 0; j < n.length; j++) if (u8[i + j] !== n[j]) continue outer
      start = i
      break
    }
    if (start !== -1) break
  }
  if (start === -1) return
  const bytes: number[] = []
  for (let k = start; k < u8.length; k++) {
    const b = u8[k]
    if (!isPrintable(b) || b === 0x22 || b === 0x27 || b === 0x20) break
    bytes.push(b)
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

async function fetchJson(url: string, timeoutMs = 6000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(ipfsToHttp(url)!, { signal: ctrl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

type HeliusLikeAsset = {
  id: string
  content?: {
    links?: { image?: string }
    json_uri?: string
    files?: { uri?: string; cdn_uri?: string; mime?: string }[]
    metadata?: { name?: string; symbol?: string }
  }
  mint_extensions?: { metadata_pointer?: { metadata_address?: string } }
}

/** Prefer CDN, then direct file, then links.image */
export function pickImageFromHeliusAsset(asset: HeliusLikeAsset): string | undefined {
  const files = asset?.content?.files ?? []
  const cdn = files.find((f) => f.cdn_uri)?.cdn_uri
  const file = files.find((f) => f.uri)?.uri
  const link = asset?.content?.links?.image
  return ipfsToHttp(cdn || file || link)
}

/** Returns { image, name, symbol, animationUrl?, jsonUri? } best-effort. */
export async function resolveNftMeta(connection: Connection, asset: HeliusLikeAsset): Promise<ResolvedNftMeta> {
  // Fast path: try content first
  const imageFast = pickImageFromHeliusAsset(asset)
  const nameFast = asset?.content?.metadata?.name
  const symbolFast = asset?.content?.metadata?.symbol
  const jsonUriFast = asset?.content?.json_uri

  if (imageFast && nameFast && symbolFast) {
    return { image: imageFast, name: nameFast, symbol: symbolFast, jsonUri: jsonUriFast }
  }

  // Try content.json_uri JSON
  if (jsonUriFast) {
    try {
      const j = await fetchJson(jsonUriFast)
      const image = ipfsToHttp(j?.image ?? j?.image_url ?? j?.properties?.image)
      const name = j?.name ?? nameFast
      const symbol = j?.symbol ?? symbolFast
      const animationUrl = ipfsToHttp(j?.animation_url)
      if (image || name || symbol || animationUrl) {
        return {
          image: image ?? imageFast,
          name: name ?? nameFast,
          symbol: symbol ?? symbolFast,
          animationUrl,
          jsonUri: jsonUriFast,
        }
      }
    } catch {}
  }

  // Token-2022 metadata pointer (SGT case)
  const metaAddr = asset?.mint_extensions?.metadata_pointer?.metadata_address
  if (metaAddr) {
    try {
      const info = await connection.getAccountInfo(new PublicKey(metaAddr))
      if (info?.data?.length) {
        const uri = extractUriFromBytes(new Uint8Array(info.data))
        if (uri) {
          const j = await fetchJson(uri)
          const image = ipfsToHttp(j?.image ?? j?.image_url ?? j?.properties?.image)
          const name = j?.name ?? nameFast
          const symbol = j?.symbol ?? symbolFast
          const animationUrl = ipfsToHttp(j?.animation_url)
          return { image: image ?? imageFast, name, symbol, animationUrl, jsonUri: uri }
        }
      }
    } catch {}
  }

  // Fallback to whatever we had
  return { image: imageFast, name: nameFast, symbol: symbolFast, jsonUri: jsonUriFast }
}
