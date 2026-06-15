import { KLEROS_CDN_BASE } from 'consts/index'

const parseUrl = (url?: string | null): URL | null => {
  if (!url || typeof url !== 'string') return null
  try {
    return new URL(url.trim())
  } catch {
    return null
  }
}

// Only https is allowed, rejects javascript:, data:, vbscript:, file:, etc.
export function isSafeNavigationUrl(url?: string | null): boolean {
  return parseUrl(url)?.protocol === 'https:'
}

// Prepend https:// to scheme-less values (e.g. "example.com") so bare domains
// are treated as web links. Values that already declare a scheme are left
// untouched and rejected later by isSafeNavigationUrl if it isn't https.
export function toNavigationUrl(url?: string | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  return /:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

const gatewayOrigin = parseUrl(KLEROS_CDN_BASE)?.origin ?? null

// Must be https URLs on the Kleros IPFS gateway under an /ipfs/ path.
export function getAllowedAttachmentUrl(
  url?: string | null,
): string | undefined {
  const parsed = parseUrl(url)
  if (!parsed || !gatewayOrigin) return undefined
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== gatewayOrigin ||
    !parsed.pathname.startsWith('/ipfs/')
  )
    return undefined
  return parsed.href
}
