import { getAddress } from 'ethers'
import type { RegistryKey } from 'utils/items'
import { registryMap } from 'utils/items'
import { chains } from 'utils/chains'
import { addressFormatProblem } from './addressFormat'
import { explainCaip10Failure, parseCaip10 } from './caip10'
import {
  getDupesInRegistry,
  getTagsQueriesDupes,
  getTokenDupesWithWebsiteCheck,
} from './duplicates'
import {
  hasPublicRpc,
  readCodeSnapshot,
  readSolanaMint,
  readTokenDecimals,
} from './evm'
import {
  isCommitHash,
  isKebabCase,
  lookupPinnedSource,
  parseGithubRepository,
  GithubRateLimitError,
  MIN_LOOKUP_COMMIT_LENGTH,
} from './github'
import { analyzeAtqSyntax, checkAtqSourceSize } from './atqSource'
import { inspectPng } from './png'
import { lengthVerdict, countCharacters } from './text'
import type { CheckResult, SubmissionDraft } from './types'

/**
 * Pre-submission checks for the four Scout registries.
 *
 * Rules marked `violation` are the registry policies' mechanical rules: an
 * item that breaks one is very likely to be challenged and lose its deposit,
 * so the form blocks submission until it is fixed. Mandatory fields, CAIP-10
 * parsing, length limits, the CDN domain pattern and the ATQ static analysis
 * apply the policies literally. The remaining `violation` rules are
 * guardrails the submission form already enforced.
 */

export const MANDATORY_FIELDS: Record<RegistryKey, readonly string[]> = {
  'tags-queries': [
    'Github Repository URL',
    'Commit hash',
    'EVM Chain ID',
    'Description',
  ],
  'single-tags': [
    'Contract Address',
    'Public Name Tag',
    'UI/Website Link',
    'Public Note',
  ],
  tokens: ['Address', 'Name', 'Symbol', 'Decimals', 'Logo', 'Website'],
  cdn: ['Contract address', 'Domain name', 'Visual proof'],
}

export const ADDRESS_FIELD: Partial<Record<RegistryKey, string>> = {
  'single-tags': 'Contract Address',
  tokens: 'Address',
  cdn: 'Contract address',
}

const IMAGE_FIELDS = new Set(['Logo', 'Visual proof'])

const LOGO_MIN_PIXELS = 128
const LOGO_MAX_BYTES = 1_048_576 // 1 MiB: larger is over "1MB" under any reading
const LOGO_POLICY_BYTES = 1_000_000 // "1MB" read as decimal megabytes

const WEBSITE_REGEX = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/
const WHITESPACE_REGEX = /\s/

const chainName = (networkId: string) =>
  chains.find((chain) => `${chain.namespace}:${chain.id}` === networkId)
    ?.name ?? networkId

export const parseSubmittedDecimals = (value: string): number | null => {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

const isPositiveChainId = (value: string) => /^[1-9][0-9]*$/.test(value)

// ---------------------------------------------------------------------------
// Local checks: synchronous, run on every keystroke.
// ---------------------------------------------------------------------------

const checkMandatoryFields = ({
  registry,
  values,
  files,
}: SubmissionDraft): CheckResult[] => {
  const results: CheckResult[] = []
  const missing: string[] = []
  for (const field of MANDATORY_FIELDS[registry]) {
    if (IMAGE_FIELDS.has(field)) {
      if (!files?.[field]) missing.push(field)
      continue
    }
    const value = values[field] ?? ''
    if (value === '') {
      missing.push(field)
      continue
    }
    if (registry === 'tokens' && field === 'Decimals') {
      if (parseSubmittedDecimals(value) === null) {
        const digits = value.trim()
        results.push({
          id: 'mandatory.decimals',
          field,
          severity: 'violation',
          outcome: 'fail',
          title: 'Decimals is a whole number',
          message:
            'Decimals must be a whole number without leading zeros, spaces or a decimal point (e.g. 18).',
          fix: /^\d+$/.test(digits) ? String(Number(digits)) : undefined,
        })
      }
    } else if (registry === 'tags-queries' && field === 'EVM Chain ID') {
      if (!isPositiveChainId(value)) {
        const digits = value.trim()
        results.push({
          id: 'mandatory.chain-id',
          field,
          severity: 'violation',
          outcome: 'fail',
          title: 'EVM Chain ID is a positive whole number',
          message:
            'EVM Chain ID must be a positive whole number without leading zeros or spaces (e.g. 1 for Ethereum).',
          fix:
            /^\d+$/.test(digits) && Number(digits) > 0
              ? digits.replace(/^0+/, '')
              : undefined,
        })
      }
    } else if (value.trim().length === 0) {
      results.push({
        id: `mandatory.${field}`,
        field,
        severity: 'violation',
        outcome: 'fail',
        title: `${field} is filled in`,
        message: 'This field only contains spaces.',
      })
    }
  }
  const invalid = results.length > 0
  results.unshift({
    id: 'mandatory-fields',
    severity: 'violation',
    outcome: missing.length > 0 ? 'pending' : invalid ? 'fail' : 'pass',
    title: 'All required fields are filled in with valid values',
    message:
      missing.length > 0
        ? `Still to fill in: ${missing.join(', ')}.`
        : undefined,
  })
  return results
}

const checkTrimmed = (
  id: string,
  field: string,
  value: string | undefined,
): CheckResult[] => {
  if (!value || value === value.trim()) return []
  return [
    {
      id,
      field,
      severity: 'violation',
      outcome: 'fail',
      title: `${field} has no leading or trailing spaces`,
      message: `${field} starts or ends with a space.`,
      fix: value.trim(),
    },
  ]
}

const checkLength = (
  id: string,
  field: string,
  value: string | undefined,
  limit: number,
): CheckResult[] => {
  if (!value) return []
  const verdict = lengthVerdict(value, limit)
  const { graphemes, codePoints } = countCharacters(value)
  const title = `${field} is at most ${limit} characters`
  if (verdict === 'over') {
    return [
      {
        id,
        field,
        severity: 'violation',
        outcome: 'fail',
        title,
        message: `${field} is ${graphemes} characters long; the policy allows at most ${limit} (spaces and punctuation count).`,
      },
    ]
  }
  if (verdict === 'ambiguous') {
    return [
      {
        id,
        field,
        severity: 'warning',
        outcome: 'fail',
        title,
        message: `${field} is ${graphemes} characters as displayed but ${codePoints} Unicode code points. Emoji or accents can make it count as more than ${limit}; consider shortening it.`,
      },
    ]
  }
  return [{ id, field, severity: 'violation', outcome: 'pass', title }]
}

const checkWebsite = (
  id: string,
  field: string,
  value: string | undefined,
): CheckResult[] => {
  if (!value) return []
  const valid = WEBSITE_REGEX.test(value)
  return [
    {
      id,
      field,
      severity: 'violation',
      outcome: valid ? 'pass' : 'fail',
      title: `${field} is a full http(s) URL`,
      message: valid
        ? undefined
        : 'The link must start with http:// or https:// and include a valid domain.',
      fix:
        !valid && WEBSITE_REGEX.test(`https://${value.trim()}`)
          ? `https://${value.trim()}`
          : undefined,
    },
  ]
}

/** CAIP-10 and chain-specific address format of the address column. */
const checkAddressFormat = ({
  registry,
  values,
}: SubmissionDraft): CheckResult[] => {
  const field = ADDRESS_FIELD[registry]
  if (!field) return []
  const caipValue = values[field] ?? ''
  const separator = caipValue.lastIndexOf(':')
  const networkId = caipValue.slice(0, separator)
  const account = caipValue.slice(separator + 1)
  if (!account) return []

  const caip = parseCaip10(caipValue)
  if (!caip) {
    const trimmed = `${networkId}:${account.trim()}`
    return [
      {
        id: 'address.caip10',
        field,
        severity: 'violation',
        outcome: 'fail',
        title: 'Address is in the chain-and-address format (CAIP-10)',
        message: explainCaip10Failure(caipValue),
        fix:
          trimmed !== caipValue && parseCaip10(trimmed) ? trimmed : undefined,
        fixLabel: account.trim(),
      },
    ]
  }
  const results: CheckResult[] = [
    {
      id: 'address.caip10',
      field,
      severity: 'violation',
      outcome: 'pass',
      title: 'Address is in the chain-and-address format (CAIP-10)',
    },
  ]
  const problem = addressFormatProblem(networkId, account)
  results.push({
    id: 'address.format',
    field,
    severity: 'violation',
    outcome: problem ? 'fail' : 'pass',
    title: `Address is valid for ${chainName(networkId)}`,
    message: problem ?? undefined,
  })
  if (
    !problem &&
    caip.namespace === 'eip155' &&
    BigInt(caip.account) < 0x10000n
  ) {
    results.push({
      id: 'address.precompile',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: 'Address is not a precompile or system address',
      message:
        'Addresses below 0x10000 are precompiles or system addresses, not contracts a project deployed. Make sure this is the address you mean.',
    })
  }
  return results
}

const checkTagsFields = ({ values }: SubmissionDraft): CheckResult[] => [
  ...checkLength(
    'tags.name-tag-length',
    'Public Name Tag',
    values['Public Name Tag'],
    50,
  ),
  ...checkTrimmed(
    'tags.name-tag-trimmed',
    'Public Name Tag',
    values['Public Name Tag'],
  ),
  ...checkTrimmed(
    'tags.project-name-trimmed',
    'Project Name',
    values['Project Name'],
  ),
  ...checkWebsite('tags.website', 'UI/Website Link', values['UI/Website Link']),
]

const checkTokenFields = ({ values }: SubmissionDraft): CheckResult[] => {
  const symbol = values.Symbol
  const results = [
    ...checkLength('tokens.name-length', 'Name', values.Name, 40),
    ...checkTrimmed('tokens.name-trimmed', 'Name', values.Name),
    ...checkLength('tokens.symbol-length', 'Symbol', symbol, 20),
    ...checkWebsite('tokens.website', 'Website', values.Website),
  ]
  if (symbol && WHITESPACE_REGEX.test(symbol)) {
    results.push({
      id: 'tokens.symbol-spaces',
      field: 'Symbol',
      severity: 'violation',
      outcome: 'fail',
      title: 'Symbol has no spaces',
      message: 'Token symbols cannot contain spaces.',
      fix:
        symbol.trim() !== symbol && !WHITESPACE_REGEX.test(symbol.trim())
          ? symbol.trim()
          : undefined,
    })
  }
  return results
}

/**
 * Anything but a (sub)domain: the bare `*`, a scheme (`https:`), a path,
 * query, fragment or whitespace, or a `:port` suffix.
 */
export const cdnDomainHasForbiddenPattern = (domain: string) =>
  domain === '*' ||
  /^[A-Za-z][A-Za-z0-9+.-]*:/.test(domain) ||
  /[\s/?#]/.test(domain) ||
  /:\d+$/.test(domain)

/**
 * IPFS, IPNS and Arweave links: the dApp is the content or the path, and the
 * host is a shared gateway, so the host is not the dApp's domain.
 */
const isGatewayLink = (value: string) =>
  /^(?:ipfs|ipns|ar):/i.test(value) ||
  /^(?:https?:\/\/)?[^/?#]+\/(?:ipfs|ipns)\//i.test(value) ||
  /^(?:https?:\/\/)?(?:[^/?#@]*\.)?arweave\.net\/[^/?#]/i.test(value)

/**
 * Best-effort bare (sub)domain for a pasted URL, e.g.
 * `https://app.x.org/swap` → `app.x.org`. No guess for gateway links or
 * schemes other than http(s), whose host is not the dApp's domain.
 */
export const suggestCdnDomain = (value: string): string | undefined => {
  const trimmed = value.trim()
  if (isGatewayLink(trimmed)) return undefined
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimmed)?.[1]
  if (scheme && !/^https?$/i.test(scheme)) return undefined
  const authority = trimmed
    .slice(scheme ? scheme.length + 3 : 0)
    .split(/[/?#]/)[0]
  const host = authority
    .slice(authority.lastIndexOf('@') + 1) // user:password@
    .replace(/:\d*$/, '') // :port
    .toLowerCase()
  return host &&
    host !== '*' &&
    host !== value &&
    !cdnDomainHasForbiddenPattern(host)
    ? host
    : undefined
}

/** ASCII letters-digits-hyphens labels, at least two, alphabetic TLD, no trailing dot. */
const isPortableHostname = (host: string): boolean => {
  if (host.length > 253) return false
  const labels = host.split('.')
  if (labels.length < 2) return false
  const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  return (
    labels.every((l) => label.test(l)) &&
    /^[a-z][a-z0-9-]*$/.test(labels[labels.length - 1])
  )
}

const checkCdnFields = ({ values }: SubmissionDraft): CheckResult[] => {
  const domain = values['Domain name']
  if (!domain) return []
  if (cdnDomainHasForbiddenPattern(domain)) {
    return [
      {
        id: 'cdn.domain-pattern',
        field: 'Domain name',
        severity: 'violation',
        outcome: 'fail',
        title: 'Domain is a plain (sub)domain',
        message:
          domain === '*'
            ? 'A contract cannot be listed under every domain. Use a specific (sub)domain, or a wildcard such as *.example.com if the contract is used across its subdomains.'
            : isGatewayLink(domain.trim())
              ? "This is a link to content on a shared gateway (IPFS, IPNS or Arweave), and the gateway's domain is not the dApp's. Enter the (sub)domain the dApp itself is served from."
              : 'Only the (sub)domain is allowed: no https://, port, path (/swap), query (?), fragment (#) or spaces.',
        fix: suggestCdnDomain(domain),
      },
    ]
  }
  const results: CheckResult[] = [
    {
      id: 'cdn.domain-pattern',
      field: 'Domain name',
      severity: 'violation',
      outcome: 'pass',
      title: 'Domain is a plain (sub)domain',
    },
  ]
  const host = domain.toLowerCase().replace(/\*/g, 'wildcard')
  if (!isPortableHostname(host)) {
    results.push({
      id: 'cdn.domain-hostname',
      field: 'Domain name',
      severity: 'warning',
      outcome: 'fail',
      title: 'Domain looks like a public hostname',
      message: /[\u0080-\uffff]/.test(domain)
        ? 'The domain has non-ASCII characters. Double-check it matches what the browser shows; reviewers may compare against the punycode (xn--) form.'
        : "This doesn't look like a public domain name (e.g. app.example.com). Check for typos, a trailing dot or a missing TLD.",
    })
  } else if (domain !== domain.toLowerCase()) {
    results.push({
      id: 'cdn.domain-lowercase',
      field: 'Domain name',
      severity: 'warning',
      outcome: 'fail',
      title: 'Domain is lowercase',
      message:
        'Domains are case-insensitive; lowercase is the conventional form.',
      fix: domain.toLowerCase(),
    })
  }
  return results
}

/** Canonical https://github.com/owner/repo form of a sloppy GitHub link. */
const suggestGithubUrl = (value: string): string | undefined => {
  const match =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i.exec(
      value.trim(),
    )
  // github.com/orgs/… and github.com/users/… are pages, not repositories.
  if (!match || /^(?:orgs|users)$/i.test(match[1])) return undefined
  const suggestion = `https://github.com/${match[1]}/${match[2]}`
  return suggestion !== value && parseGithubRepository(suggestion)
    ? suggestion
    : undefined
}

const checkAtqFields = ({ values }: SubmissionDraft): CheckResult[] => {
  const results: CheckResult[] = []
  const url = values['Github Repository URL']
  if (url) {
    const repository = parseGithubRepository(url)
    results.push({
      id: 'atq.repository-url',
      field: 'Github Repository URL',
      severity: 'violation',
      outcome: repository ? 'pass' : 'fail',
      title: 'Repository link is an https://github.com/owner/repo URL',
      message: repository
        ? undefined
        : 'Use the repository URL itself, like https://github.com/owner/repo-name, over HTTPS and without /tree/… or /blob/… paths.',
      fix: repository ? undefined : suggestGithubUrl(url),
    })
  }
  const commit = values['Commit hash']
  if (commit) {
    const valid = isCommitHash(commit)
    results.push({
      id: 'atq.commit-hash',
      field: 'Commit hash',
      severity: 'violation',
      outcome: valid ? 'pass' : 'fail',
      title: 'Commit hash is 1–40 hexadecimal characters',
      message: valid
        ? undefined
        : 'A commit hash only contains 0-9 and a-f, up to 40 characters.',
      fix: !valid && isCommitHash(commit.trim()) ? commit.trim() : undefined,
    })
    if (valid && commit.length < MIN_LOOKUP_COMMIT_LENGTH) {
      results.push({
        id: 'atq.commit-length',
        field: 'Commit hash',
        severity: 'warning',
        outcome: 'fail',
        title: `Commit hash has at least ${MIN_LOOKUP_COMMIT_LENGTH} characters`,
        message: `Shorter hashes can match several commits, so the module is only looked up on GitHub once the hash has ${MIN_LOOKUP_COMMIT_LENGTH} or more characters (e.g. 3f4a02a). Enter at least ${MIN_LOOKUP_COMMIT_LENGTH}, or the full 40.`,
      })
    }
  }
  return results
}

export const runLocalChecks = (draft: SubmissionDraft): CheckResult[] => {
  const results = [...checkMandatoryFields(draft), ...checkAddressFormat(draft)]
  switch (draft.registry) {
    case 'single-tags':
      results.push(...checkTagsFields(draft))
      break
    case 'tokens':
      results.push(...checkTokenFields(draft))
      break
    case 'cdn':
      results.push(...checkCdnFields(draft))
      break
    case 'tags-queries':
      results.push(...checkAtqFields(draft))
      break
  }
  return results
}

/** True when every local rule a network check depends on passes. */
const passes = (results: CheckResult[], id: string) =>
  results.some((r) => r.id === id && r.outcome === 'pass')

// ---------------------------------------------------------------------------
// Network checks: debounced and cached by the hook.
// ---------------------------------------------------------------------------

const describeFailure = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/** What the chain reports about a token's decimals. */
export interface ChainDecimals {
  value: number
  /** `contract`: an EVM token's decimals(); `mint`: a Solana SPL mint. */
  source: 'contract' | 'mint'
  /** Independent providers that agree on the value. */
  providers: number
}

/**
 * What the chain says about the draft's address. Nothing in it depends on
 * the Decimals field: `compareDecimals` checks that in render, so editing
 * Decimals never re-reads the chain.
 */
export interface AddressOnChain {
  results: CheckResult[]
  decimals?: ChainDecimals
}

const DECIMALS_TITLE = {
  contract: 'Decimals match the token contract (decimals())',
  mint: 'Decimals match the token mint',
} as const

/**
 * How many providers answered. Only two independent providers that agree can
 * block a submission; a single one (some chains have no second public RPC)
 * could be lagging or wrong, so its verdict only warns.
 */
const providerNote = (providers: number) =>
  providers >= 2
    ? `${providers} independent providers agree`
    : 'only 1 provider could be asked, so this is a warning, not a block'

/** Deployed bytecode (EVM), decimals() (Tokens) and Solana account reads. */
export const readAddressOnChain = async (
  draft: SubmissionDraft,
  signal?: AbortSignal,
): Promise<AddressOnChain> => {
  const none: AddressOnChain = { results: [] }
  const field = ADDRESS_FIELD[draft.registry]
  if (!field) return none
  const local = checkAddressFormat(draft)
  if (!passes(local, 'address.format')) return none
  const caip = parseCaip10(draft.values[field])
  if (!caip) return none
  const network = `${caip.namespace}:${caip.reference}`
  const chain = chainName(network)
  const deployedTitle = `A contract is deployed at this address on ${chain}`

  if (caip.namespace === 'solana') {
    let mint
    try {
      mint = await readSolanaMint(caip.account, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      return {
        results: [
          {
            id: 'address.deployed',
            field,
            severity: 'warning',
            outcome: 'inconclusive',
            title: deployedTitle,
            message: `Couldn't reach Solana to verify the account: ${describeFailure(error)}`,
          },
        ],
      }
    }
    if (draft.registry !== 'tokens') {
      return {
        results:
          mint.kind === 'missing'
            ? [
                {
                  id: 'address.deployed',
                  field,
                  severity: 'warning',
                  outcome: 'fail',
                  title: deployedTitle,
                  message: 'No account exists at this address on Solana.',
                },
              ]
            : [],
      }
    }
    const mintTitle = 'Address is an SPL token mint'
    if (mint.kind !== 'mint') {
      const message =
        mint.kind === 'missing'
          ? 'No account exists at this address on Solana.'
          : mint.kind === 'not-token-program'
            ? 'This account is not owned by the SPL Token or Token-2022 program, so it is not a token mint.'
            : `This is an SPL ${mint.type} account, not the token's mint address.`
      return {
        results: [
          {
            id: 'tokens.solana-mint',
            field,
            severity: 'warning',
            outcome: 'fail',
            title: mintTitle,
            message,
          },
        ],
      }
    }
    return {
      results: [
        {
          id: 'tokens.solana-mint',
          field,
          severity: 'warning',
          outcome: 'pass',
          title: mintTitle,
        },
      ],
      // One public Solana RPC: a mismatch can only warn.
      decimals: { value: mint.decimals, source: 'mint', providers: 1 },
    }
  }

  if (caip.namespace !== 'eip155') {
    return {
      results: [
        {
          id: 'address.deployed',
          field,
          severity: 'warning',
          outcome: 'inconclusive',
          title: deployedTitle,
          message:
            'This form can only verify EVM and Solana addresses. Make sure this is a contract, not a regular wallet.',
          final: true,
        },
      ],
    }
  }

  const chainId = Number(caip.reference)
  if (
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    BigInt(caip.account) < 0x10000n
  )
    return none
  if (!hasPublicRpc(chainId)) {
    return {
      results: [
        {
          id: 'address.deployed',
          field,
          severity: 'violation',
          outcome: 'inconclusive',
          title: deployedTitle,
          message: `This form has no public RPC for ${chain}, so it can't check the address. Make sure it is a deployed contract.`,
          final: true,
        },
      ],
    }
  }

  const address = getAddress(caip.account.toLowerCase())
  const code = await readCodeSnapshot(chainId, address, signal)
  if (code.status !== 'agreed') {
    return {
      results: [
        {
          id: 'address.deployed',
          field,
          severity: 'violation',
          outcome: 'inconclusive',
          title: deployedTitle,
          message:
            code.status === 'disagreed'
              ? `RPC providers for ${chain} disagree about this address. Try again in a minute.`
              : `Couldn't reach ${chain} to verify the contract. ${code.reason}`,
        },
      ],
    }
  }
  const finalized =
    code.values.map((v) => v.finalized).find((v) => v !== null) ?? null
  const latest = code.value.latest
  const providers = code.providers.length
  const results: CheckResult[] = []
  if (!latest && !finalized) {
    results.push({
      id: 'address.deployed',
      field,
      severity: providers >= 2 ? 'violation' : 'warning',
      outcome: 'fail',
      title: deployedTitle,
      message: `There is no contract code at this address on ${chain} (${providerNote(providers)}). The policy only accepts deployed contracts, not wallets (EOAs) or undeployed addresses. Check the address and the selected chain.`,
    })
    return { results }
  }
  if (code.value.delegatedEoa) {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: deployedTitle,
      message: `This is a wallet (EOA) that delegates to smart-account code through EIP-7702, not a contract. The policy excludes EOAs, so it may be challenged even though there is code at this address.`,
    })
    return { results }
  }
  if (latest && finalized === false) {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: deployedTitle,
      message: `The contract exists but its deployment is not finalized on ${chain} yet. Wait until it is final before submitting: until then, anyone reading finalized state sees no contract here.`,
    })
  } else {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'violation',
      outcome: 'pass',
      title: deployedTitle,
    })
  }

  if (draft.registry !== 'tokens') return { results }
  const read = await readTokenDecimals(chainId, address, signal)
  if (read.status !== 'agreed') {
    results.push({
      id: 'tokens.decimals-onchain',
      field: 'Decimals',
      severity: 'violation',
      outcome: 'inconclusive',
      title: DECIMALS_TITLE.contract,
      message:
        read.status === 'disagreed'
          ? 'RPC providers disagree about decimals(). Try again in a minute.'
          : `Couldn't read decimals(). ${read.reason}`,
    })
    return { results }
  }
  if (read.value.kind === 'unreadable') {
    results.push({
      id: 'tokens.decimals-onchain',
      field: 'Decimals',
      severity: 'warning',
      outcome: 'fail',
      title: DECIMALS_TITLE.contract,
      message: `${read.value.reason[0].toUpperCase()}${read.value.reason.slice(1)}. The policy requires EVM tokens to follow ERC-20; make sure this is the token contract.`,
    })
    return { results }
  }
  return {
    results,
    decimals: {
      value: read.value.decimals,
      source: 'contract',
      providers: read.providers.length,
    },
  }
}

/**
 * The form's Decimals against what the chain reported. Cheap, so it runs on
 * every render instead of being part of the (cached) on-chain read.
 */
export const compareDecimals = (
  onchain: ChainDecimals | undefined,
  entered: string,
): CheckResult[] => {
  if (!onchain) return []
  const { value, source, providers } = onchain
  const submitted = parseSubmittedDecimals(entered)
  const reported =
    source === 'contract'
      ? `The contract's decimals() returns ${value}`
      : `The mint reports ${value} decimals`
  return [
    {
      id: 'tokens.decimals-onchain',
      field: 'Decimals',
      severity: providers >= 2 ? 'violation' : 'warning',
      outcome:
        submitted === null ? 'pending' : submitted === value ? 'pass' : 'fail',
      title: DECIMALS_TITLE[source],
      message:
        submitted === null
          ? `${reported}.`
          : submitted === value
            ? undefined
            : `${reported}, but you entered ${submitted} (${providerNote(providers)}).`,
      fix: submitted === value ? undefined : String(value),
    },
  ]
}

/** The on-chain read and the decimals comparison together, for one draft. */
export const checkAddressOnChain = async (
  draft: SubmissionDraft,
  signal?: AbortSignal,
): Promise<CheckResult[]> => {
  const { results, decimals } = await readAddressOnChain(draft, signal)
  return [...results, ...compareDecimals(decimals, draft.values.Decimals ?? '')]
}

/** Registry occupancy, using the same indexer queries as before. */
export const checkDuplicates = async (
  draft: SubmissionDraft,
): Promise<CheckResult[]> => {
  const { registry, values } = draft
  const title = 'Not already in the registry'
  const local = runLocalChecks(draft)
  let duplicates = 0
  let message =
    'An entry with the same identifiers is already registered or pending.'
  let field: string | undefined
  try {
    if (registry === 'single-tags' || registry === 'cdn') {
      field = ADDRESS_FIELD[registry]
      if (!field || !passes(local, 'address.format')) return []
      if (
        registry === 'cdn' &&
        (!values['Domain name'] || !passes(local, 'cdn.domain-pattern'))
      )
        return []
      duplicates = await getDupesInRegistry(
        values[field],
        registryMap[registry],
        registry === 'cdn' ? values['Domain name'] : undefined,
      )
      if (registry === 'cdn')
        message =
          'This address is already registered or pending for this domain.'
    } else if (registry === 'tokens') {
      field = 'Address'
      if (!passes(local, 'address.format')) return []
      duplicates = await getTokenDupesWithWebsiteCheck(
        values.Address,
        registryMap.tokens,
      )
      message = 'This token is already registered or pending (with a website).'
    } else {
      field = 'Commit hash'
      const url = values['Github Repository URL']
      const commit = values['Commit hash']
      const chainId = values['EVM Chain ID']
      if (
        !passes(local, 'atq.repository-url') ||
        !passes(local, 'atq.commit-hash') ||
        !chainId ||
        !isPositiveChainId(chainId)
      )
        return []
      duplicates = await getTagsQueriesDupes(
        url,
        commit,
        chainId,
        registryMap['tags-queries'],
      )
      message =
        'This repository, commit and chain are already registered or pending. Check the existing entry before continuing.'
    }
  } catch (error) {
    return [
      {
        id: 'duplicate',
        field,
        severity: 'violation',
        outcome: 'inconclusive',
        title,
        message: `Couldn't query the registry: ${describeFailure(error)}`,
      },
    ]
  }
  return [
    {
      id: 'duplicate',
      field,
      severity: 'violation',
      outcome: duplicates > 0 ? 'fail' : 'pass',
      title,
      message: duplicates > 0 ? message : undefined,
    },
  ]
}

const MAGIC_TYPES: [number[], string][] = [
  [[0xff, 0xd8, 0xff], 'a JPEG'],
  [[0x47, 0x49, 0x46, 0x38], 'a GIF'],
  [[0x52, 0x49, 0x46, 0x46], 'a WebP'],
  [[0x3c], 'an SVG/XML'],
]

/** This environment has no image decoder, which says nothing about the file. */
class NoImageDecoder extends Error {}

/** Decodes the image like a browser displaying it; rejects when its data can't be decoded. */
const decodeDimensions = async (
  file: Blob,
): Promise<{ width: number; height: number }> => {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    try {
      return { width: bitmap.width, height: bitmap.height }
    } finally {
      bitmap.close()
    }
  }
  if (
    typeof Image === 'function' &&
    typeof Image.prototype.decode === 'function' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      return { width: image.naturalWidth, height: image.naturalHeight }
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  throw new NoImageDecoder()
}

/** Tokens logo: PNG structure, full decode, ≥128×128 and ≤1 MB. */
export const checkTokenLogo = async (file: File): Promise<CheckResult[]> => {
  const field = 'Logo'
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { structure, integrityWarnings, imageData } = inspectPng(bytes)
  const pngTitle = 'Logo is a valid PNG file'
  if (!structure.valid) {
    const other = MAGIC_TYPES.find(([magic]) =>
      magic.every((b, i) => bytes[i] === b),
    )?.[1]
    return [
      {
        id: 'tokens.logo-png',
        field,
        severity: 'violation',
        outcome: 'fail',
        title: pngTitle,
        message: other
          ? `This file is ${other} image. The policy requires a PNG; export it as PNG.`
          : `${structure.reason} Re-export the logo as a standard PNG.`,
      },
    ]
  }
  const results: CheckResult[] = [
    {
      id: 'tokens.logo-png',
      field,
      severity: 'violation',
      outcome: 'pass',
      title: pngTitle,
    },
  ]
  if (integrityWarnings.length > 0) {
    results.push({
      id: 'tokens.logo-integrity',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: 'Logo file is intact',
      message: integrityWarnings.join(' '),
    })
  }

  // A logo that can't be displayed blocks, as the upload field always did.
  const decodeTitle = 'Logo image can be decoded'
  if (!imageData) {
    results.push({
      id: 'tokens.logo-decode',
      field,
      severity: 'violation',
      outcome: 'fail',
      title: decodeTitle,
      message:
        'The PNG has no image data (no IDAT chunk), so nothing can display it. Re-export the logo.',
    })
  } else {
    try {
      const decoded = await decodeDimensions(file)
      const sameSize =
        decoded.width === structure.width && decoded.height === structure.height
      results.push(
        sameSize
          ? {
              id: 'tokens.logo-decode',
              field,
              severity: 'violation',
              outcome: 'pass',
              title: decodeTitle,
            }
          : {
              id: 'tokens.logo-decode',
              field,
              severity: 'warning',
              outcome: 'fail',
              title: decodeTitle,
              message:
                'The image header and decoded pixels disagree on the size; the file may be malformed. Re-export it.',
            },
      )
    } catch (error) {
      results.push(
        error instanceof NoImageDecoder
          ? {
              id: 'tokens.logo-decode',
              field,
              severity: 'violation',
              outcome: 'inconclusive',
              title: decodeTitle,
              message:
                "This browser can't decode images here, so the logo's pixels weren't checked.",
            }
          : {
              id: 'tokens.logo-decode',
              field,
              severity: 'violation',
              outcome: 'fail',
              title: decodeTitle,
              message:
                "The logo's image data can't be decoded; the file is probably corrupted. Re-export it as PNG.",
            },
      )
    }
  }

  const { width, height, byteLength } = structure
  const dimensionsTitle = `Logo is at least ${LOGO_MIN_PIXELS}×${LOGO_MIN_PIXELS} pixels`
  results.push({
    id: 'tokens.logo-dimensions',
    field,
    severity: 'violation',
    outcome:
      width < LOGO_MIN_PIXELS || height < LOGO_MIN_PIXELS ? 'fail' : 'pass',
    title: dimensionsTitle,
    message:
      width < LOGO_MIN_PIXELS || height < LOGO_MIN_PIXELS
        ? `The logo is ${width}×${height}. The policy requires at least ${LOGO_MIN_PIXELS}×${LOGO_MIN_PIXELS}.`
        : undefined,
  })
  const sizeTitle = 'Logo file is at most 1 MB'
  if (byteLength > LOGO_MAX_BYTES) {
    results.push({
      id: 'tokens.logo-size',
      field,
      severity: 'violation',
      outcome: 'fail',
      title: sizeTitle,
      message: `The logo is ${byteLength.toLocaleString()} bytes. The policy allows at most 1 MB, and this is over it whether 1 MB means ${LOGO_POLICY_BYTES.toLocaleString()} or ${LOGO_MAX_BYTES.toLocaleString()} bytes.`,
    })
  } else if (byteLength > LOGO_POLICY_BYTES) {
    results.push({
      id: 'tokens.logo-size',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: sizeTitle,
      message: `The logo is ${byteLength.toLocaleString()} bytes, just over 1,000,000. Compress it a little so it is under 1 MB under any reading of the policy.`,
    })
  } else {
    results.push({
      id: 'tokens.logo-size',
      field,
      severity: 'violation',
      outcome: 'pass',
      title: sizeTitle,
    })
  }
  return results
}

export type TypeScriptLoader = () => Promise<typeof import('typescript')>

/** ATQ: the pinned GitHub source exists and passes the static rules. */
export const checkAtqSource = async (
  draft: SubmissionDraft,
  loadTypeScript: TypeScriptLoader,
  signal?: AbortSignal,
): Promise<CheckResult[]> => {
  const field = 'Github Repository URL'
  const repository = parseGithubRepository(draft.values[field])
  const commit = draft.values['Commit hash']
  if (!repository || !isCommitHash(commit)) return []
  const title = 'The commit and src/main.mts exist on GitHub'
  const slug = `${repository.owner}/${repository.repository}`

  let lookup
  try {
    lookup = await lookupPinnedSource(repository, commit, signal)
  } catch (error) {
    // A cancelled check says nothing about GitHub; let the query see it.
    if (signal?.aborted) throw error
    return [
      {
        id: 'atq.source-resolves',
        field,
        severity: 'violation',
        outcome: 'inconclusive',
        title,
        message:
          error instanceof GithubRateLimitError
            ? error.message
            : `Couldn't reach GitHub: ${describeFailure(error)}`,
      },
    ]
  }
  const { repositoryStatus, commitStatus, sourceStatus } = lookup
  const notFound = (status: number) => status === 404 || status === 422
  let failure: string | undefined
  if (
    repositoryStatus === 404 &&
    commitStatus === 404 &&
    sourceStatus === 404
  ) {
    failure = `GitHub can't find ${slug}. The repository must be public so jurors can inspect it.`
  } else if (repositoryStatus === 200 && notFound(commitStatus)) {
    failure = `Commit ${commit} does not exist in ${slug}. Push it, or check the hash.`
  } else if (
    repositoryStatus === 200 &&
    commitStatus === 200 &&
    sourceStatus === 404
  ) {
    failure =
      'This commit has no src/main.mts. The policy requires the module to be a single file at src/main.mts.'
  }
  if (failure)
    return [
      {
        id: 'atq.source-resolves',
        field,
        severity: 'violation',
        outcome: 'fail',
        title,
        message: failure,
      },
    ]
  if (
    repositoryStatus !== 200 ||
    commitStatus !== 200 ||
    sourceStatus !== 200 ||
    lookup.source === undefined
  ) {
    return [
      {
        id: 'atq.source-resolves',
        field,
        severity: 'violation',
        outcome: 'inconclusive',
        title,
        message: `GitHub answered HTTP ${repositoryStatus} / ${commitStatus} / ${sourceStatus} for the repository, commit and file. Try again shortly.`,
      },
    ]
  }

  const results: CheckResult[] = [
    {
      id: 'atq.source-resolves',
      field,
      severity: 'violation',
      outcome: 'pass',
      title,
    },
  ]
  const name = lookup.canonicalName ?? ''
  results.push({
    id: 'atq.repository-name',
    field,
    severity: 'violation',
    outcome: isKebabCase(name) ? 'pass' : 'fail',
    title: 'Repository name is kebab-case',
    message: isKebabCase(name)
      ? undefined
      : `GitHub reports the repository name as "${name}". It must be kebab-case: lowercase letters and digits separated by single hyphens (e.g. my-protocol-tags).`,
  })

  // The line limit first: a file far over it isn't parsed (or the parser even
  // downloaded), since parsing a huge file would freeze the page.
  const size = checkAtqSourceSize(lookup.source, lookup.sourceTruncated)
  results.push(...size.results)
  if (!size.parse) return results

  let ts
  try {
    const loaded = await loadTypeScript()
    ts = ((loaded as { default?: typeof loaded }).default ??
      loaded) as typeof import('typescript')
  } catch (error) {
    results.push({
      id: 'atq.typescript-syntax',
      field,
      severity: 'violation',
      outcome: 'inconclusive',
      title: 'src/main.mts parses as TypeScript',
      message: `Couldn't load the TypeScript parser: ${describeFailure(error)}`,
    })
    return results
  }
  results.push(...analyzeAtqSyntax(ts, lookup.source))
  return results
}
