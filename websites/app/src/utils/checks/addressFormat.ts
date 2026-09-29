import { isAddress } from 'ethers'
import { PublicKey } from '@solana/web3.js'
import bs58check from 'bs58check'
import { bech32, bech32m } from '@scure/base'
import { chains } from 'utils/chains'

const isSolanaAddress = (value: string) => {
  try {
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

const isBip122Address = (value: string): boolean => {
  // Legacy Base58Check (P2PKH / P2SH)
  try {
    const decoded = bs58check.decode(value)
    const version = decoded[0]
    if (version === 0x00 || version === 0x05) return true
  } catch {}

  // Try Bech32 (v0) first
  try {
    const { prefix, words } = bech32.decode(value as `${string}1${string}`)
    if (prefix !== 'bc') return false

    const version = words[0]
    const data = bech32.fromWords(words.slice(1))
    if (version === 0 && (data.length === 20 || data.length === 32)) return true
  } catch {}

  // Try Bech32m (v1+ e.g. Taproot)
  try {
    const { prefix, words } = bech32m.decode(value as `${string}1${string}`)
    if (prefix !== 'bc') return false

    const version = words[0]
    const data = bech32m.fromWords(words.slice(1))
    if (version === 1 && data.length === 32) return true
  } catch {}

  return false
}

/**
 * Chain-specific address validation. Stricter than CAIP-10 parsing: EVM
 * mixed-case addresses must carry a valid EIP-55 checksum, which catches
 * typos the automated checks would not notice.
 *
 * Returns `null` when valid, otherwise the reason.
 */
export const addressFormatProblem = (
  networkId: string,
  address: string,
): string | null => {
  const network = chains.find(
    (chain) => `${chain.namespace}:${chain.id}` === networkId,
  )
  if (!network) return 'This chain is not supported by the registry.'

  if (network.namespace === 'solana') {
    if (isSolanaAddress(address)) return null
    const base58 =
      /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
    return address.length >= 32 && address.length <= 44 && base58.test(address)
      ? 'Solana addresses are case-sensitive. Please verify the exact casing of the address.'
      : 'Invalid Solana address format.'
  }
  if (network.namespace === 'bip122') {
    return isBip122Address(address) ? null : 'Invalid Bitcoin address format.'
  }
  if (network.namespace === 'eip155') {
    if (!address.startsWith('0x'))
      return 'Address must start with "0x" for EVM chains.'
    if (isAddress(address)) return null
    return /^0x[0-9a-fA-F]{40}$/.test(address)
      ? "The address's mixed-case checksum is wrong, which usually means a typo. Copy it again from the explorer."
      : 'Invalid EVM address format.'
  }
  return 'Unsupported address namespace.'
}
