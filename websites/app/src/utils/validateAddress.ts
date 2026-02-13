import { isAddress } from 'ethers'
import request, { gql } from 'graphql-request'
import { registryMap } from './items'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index'
import { PublicKey } from '@solana/web3.js'
import { chains } from 'utils/chains'
import bs58check from 'bs58check'
import { bech32, bech32m } from '@scure/base'

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
    const { prefix, words } = bech32.decode(value)
    if (prefix !== 'bc') return false

    const version = words[0]
    const data = bech32.fromWords(words.slice(1))
    if (version === 0 && (data.length === 20 || data.length === 32)) return true
  } catch {}

  // Try Bech32m (v1+ e.g. Taproot)
  try {
    const { prefix, words } = bech32m.decode(value)
    if (prefix !== 'bc') return false

    const version = words[0]
    const data = bech32m.fromWords(words.slice(1))
    if (version === 1 && data.length === 32) return true
  } catch {}

  return false
}

const isValidAddressForChain = (chainId: string, address: string): boolean => {
  const network = chains.find(
    (chain) => `${chain.namespace}:${chain.id}` === chainId,
  )

  if (!network) return false
  if (network.namespace === 'solana') return isSolanaAddress(address)
  if (network.namespace === 'bip122') return isBip122Address(address)
  if (network.namespace === 'eip155') {
    if (!address.startsWith('0x')) return false
    return isAddress(address)
  }
  return false
}

export interface Issue {
  address?: {
    severity: 'warn' | 'error'
    message: string
  }
  domain?: {
    severity: 'warn' | 'error'
    message: string
  }
  duplicate?: {
    severity: 'warn' | 'error'
    message: string
  }
  contract?: {
    severity: 'warn' | 'error'
    message: string
  }
  projectName?: {
    severity: 'warn' | 'error'
    message: string
  }
  publicNameTag?: {
    severity: 'warn' | 'error'
    message: string
  }
  link?: {
    severity: 'warn' | 'error'
    message: string
  }
  symbol?: {
    severity: 'warn' | 'error'
    message: string
  }
}

const getDupesInRegistry = async (
  richAddress: string,
  registryAddress: string,
  domain?: string,
): Promise<number> => {
  const query = gql`
    query ($registry: String!, $richAddress: String!, $domain: String) {
      litems: LItem(
        where: {
          registry_id: { _eq: $registry }
          status: { _in: [ "Registered", "ClearingRequested", "RegistrationRequested"] }
          key0: { _ilike: $richAddress }
          ${domain ? `key1: { _ilike: $domain }` : ''}
        }
      ) {
        id
      }
    }
  `

  const variables: Record<string, any> = {
    registry: registryAddress,
    richAddress: `%${richAddress}%`, // contains
  }
  if (domain) {
    variables.domain = `${domain}%` // starts with
  }

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables,
  })) as any
  const items = result.litems
  return items.length
}

const getTokenDupesWithWebsiteCheck = async (
  richAddress: string,
  registryAddress: string,
): Promise<number> => {
  const query = gql`
    query ($registry: String!, $richAddress: String!) {
      litems: LItem(
        where: {
          registry_id: { _eq: $registry }
          status: {
            _in: ["Registered", "ClearingRequested", "RegistrationRequested"]
          }
          key0: { _ilike: $richAddress }
        }
      ) {
        id
        key3
      }
    }
  `

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables: {
      registry: registryAddress,
      richAddress,
    },
  })) as any

  // Only count duplicates if existing items have a website (key3)
  const duplicatesWithWebsite = result.litems.filter(
    (item: any) => item?.key3 && item.key3.trim() !== '',
  )

  return duplicatesWithWebsite.length
}

export const getAddressValidationIssue = async (
  chainId: string,
  registry: string,
  address?: string,
  domain?: string,
  projectName?: string,
  publicNameTag?: string,
  link?: string,
  symbol?: string,
): Promise<Issue | null> => {
  const result: Issue = {}

  if (address && !isValidAddressForChain(chainId, address)) {
    const network = chains.find(
      (chain) => `${chain.namespace}:${chain.id}` === chainId,
    )
    let message = 'Invalid address for the specified chain'

    if (network?.namespace === 'solana') {
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
      if (address.length >= 32 && address.length <= 44 && base58Regex.test(address)) {
        message = 'Solana addresses are case-sensitive. Please verify the exact casing of the address.'
      } else {
        message = 'Invalid Solana address format'
      }
    } else if (network?.namespace === 'eip155' && !address.startsWith('0x')) {
      message = 'Address must start with "0x" prefix for Ethereum-like chains'
    } else if (
      network?.namespace === 'eip155' &&
      address.startsWith('0x') &&
      !isAddress(address)
    ) {
      message = 'Invalid Ethereum address format'
    }

    result.address = { message, severity: 'error' }
  }

  if (publicNameTag && publicNameTag.length > 50) {
    result.publicNameTag = {
      message: 'Public Name Tag too long (max 50 characters)',
      severity: 'error',
    }
  }

  if (projectName && projectName !== projectName.trim()) {
    result.projectName = {
      message: 'Project name has leading or trailing whitespace',
      severity: 'warn',
    }
  }

  if (registry === 'tokens' && projectName && projectName.length > 40) {
    result.projectName = {
      message: 'Public Name too long (max 40 characters)',
      severity: 'warn',
    }
  }

  if (registry === 'tokens' && symbol && symbol.length > 20) {
    result.symbol = {
      message: 'Symbol too long (max 20 characters)',
      severity: 'warn',
    }
  }

  if (publicNameTag && publicNameTag !== publicNameTag.trim()) {
    result.publicNameTag = {
      message: 'Public Name Tag has leading or trailing whitespace',
      severity: 'warn',
    }
  }

  const cdnRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/
  if (domain && !cdnRegex.test(domain)) {
    result.domain = {
      message: 'Invalid website format for CDN. Must be a valid domain',
      severity: 'error',
    }
  }

  const tagRegex = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/
  if (link && !tagRegex.test(link)) {
    result.link = {
      message:
        'Invalid website format. Must start with http(s):// and include a valid domain',
      severity: 'error',
    }
  }

  if (Object.keys(result).length > 0) return result

  // Check for duplicates based on registry type
  if (registry === 'single-tags' || registry === 'cdn') {
    const ndupes = await getDupesInRegistry(
      chainId + ':' + address,
      registryMap[registry],
      domain,
    )

    if (ndupes > 0) {
      result.duplicate = { message: 'Duplicate submission', severity: 'error' }
    }
  } else if (registry === 'tokens') {
    // For tokens, only consider it a duplicate if any of the existing items have a website
    const ndupes = await getTokenDupesWithWebsiteCheck(
      chainId + ':' + address,
      registryMap[registry],
    )

    if (ndupes > 0) {
      result.duplicate = {
        message: 'Duplicate submission - token with website already exists',
        severity: 'error',
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

export default getAddressValidationIssue
