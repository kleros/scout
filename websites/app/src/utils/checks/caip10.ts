export interface Caip10 {
  namespace: string
  reference: string
  account: string
}

/**
 * CAIP-10 parsing exactly as the automated checks apply it: no trimming,
 * lowercase namespace, and for `eip155` a canonical decimal chain reference
 * and a 20-byte hex account. EIP-55 checksum casing is not enforced here.
 */
export const parseCaip10 = (value: unknown): Caip10 | null => {
  if (typeof value !== 'string') return null
  const match =
    /^([-a-z0-9]{3,8}):([-_a-zA-Z0-9]{1,32}):([-.%a-zA-Z0-9]{1,128})$/.exec(
      value,
    )
  if (!match) return null
  const parsed = { namespace: match[1], reference: match[2], account: match[3] }
  if (
    parsed.namespace === 'eip155' &&
    (!/^(?:0|[1-9][0-9]{0,31})$/.test(parsed.reference) ||
      !/^0x[0-9a-fA-F]{40}$/.test(parsed.account))
  ) {
    return null
  }
  return parsed
}

/** Why a CAIP-10 value failed, phrased for the person typing the address. */
export const explainCaip10Failure = (value: string): string => {
  const account = value.slice(value.lastIndexOf(':') + 1)
  if (/\s/.test(value)) return 'The address contains spaces. Remove them.'
  if (value.startsWith('eip155:')) {
    if (!account.startsWith('0x')) return 'EVM addresses must start with 0x.'
    if (account.length !== 42)
      return `EVM addresses are 42 characters long (0x + 40 hex); this one has ${account.length}.`
    return 'The address contains characters that are not hexadecimal.'
  }
  return 'The address is not in the chain-and-address format (CAIP-10) the registry requires.'
}
