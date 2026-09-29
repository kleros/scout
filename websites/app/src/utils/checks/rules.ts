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
} from './github'
import { analyzeAtqSource } from './atqSource'
import { inspectPng } from './png'
import { lengthVerdict, countCharacters } from './text'
import type { CheckResult, SubmissionDraft } from './types'

/**
 * Pre-submission checks for the four Scout registries.
 *
 * Rules marked `violation` mirror the deterministic checks run automatically
 * on every new registration request: an item failing one of them gets
 * challenged and the deposit is lost. Mandatory fields, CAIP-10 parsing,
 * length limits, the CDN domain pattern and the ATQ static analysis follow
 * those checks' exact semantics. The remaining
 * `violation` rules are guardrails the submission form already enforced.
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
const LOGO_MAX_BYTES = 1_048_576 // the automated checks' threshold (1 MiB)
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

const pluralize = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`

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
        'Addresses below 0x10000 are precompiles or system addresses, not deployed project contracts. Automated checks send these to manual review.',
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

/** Exactly the automated checks' forbidden-pattern predicate. */
export const cdnDomainHasForbiddenPattern = (domain: string) =>
  domain === '*' ||
  /^[A-Za-z][A-Za-z0-9+.-]*:/.test(domain) ||
  /[\s/?#]/.test(domain)

/** Best-effort bare (sub)domain for a pasted URL, e.g. `https://app.x.org/swap` → `app.x.org`. */
export const suggestCdnDomain = (value: string): string | undefined => {
  const host = value
    .trim()
    .replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
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
  if (!match) return undefined
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

/** Deployed bytecode (EVM), decimals() (Tokens) and Solana account checks. */
export const checkAddressOnChain = async (
  draft: SubmissionDraft,
  signal?: AbortSignal,
): Promise<CheckResult[]> => {
  const field = ADDRESS_FIELD[draft.registry]
  if (!field) return []
  const local = checkAddressFormat(draft)
  if (!passes(local, 'address.format')) return []
  const caip = parseCaip10(draft.values[field])
  if (!caip) return []
  const network = `${caip.namespace}:${caip.reference}`
  const chain = chainName(network)
  const deployedTitle = `A contract is deployed at this address on ${chain}`

  if (caip.namespace === 'solana') {
    let mint
    try {
      mint = await readSolanaMint(caip.account, signal)
    } catch (error) {
      return [
        {
          id: 'address.deployed',
          field,
          severity: 'warning',
          outcome: 'inconclusive',
          title: deployedTitle,
          message: `Couldn't reach Solana to verify the account: ${describeFailure(error)}`,
        },
      ]
    }
    if (draft.registry !== 'tokens') {
      return mint.kind === 'missing'
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
        : []
    }
    const mintTitle = 'Address is an SPL token mint'
    if (mint.kind !== 'mint') {
      const message =
        mint.kind === 'missing'
          ? 'No account exists at this address on Solana.'
          : mint.kind === 'not-token-program'
            ? 'This account is not owned by the SPL Token or Token-2022 program, so it is not a token mint.'
            : `This is an SPL ${mint.type} account, not the token's mint address.`
      return [
        {
          id: 'tokens.solana-mint',
          field,
          severity: 'warning',
          outcome: 'fail',
          title: mintTitle,
          message,
        },
      ]
    }
    const results: CheckResult[] = [
      {
        id: 'tokens.solana-mint',
        field,
        severity: 'warning',
        outcome: 'pass',
        title: mintTitle,
      },
    ]
    const submitted = parseSubmittedDecimals(draft.values.Decimals ?? '')
    results.push({
      id: 'tokens.decimals-onchain',
      field: 'Decimals',
      severity: 'warning',
      outcome:
        submitted === null
          ? 'pending'
          : submitted === mint.decimals
            ? 'pass'
            : 'fail',
      title: 'Decimals match the token mint',
      message:
        submitted === null
          ? `The mint reports ${mint.decimals} decimals.`
          : submitted === mint.decimals
            ? undefined
            : `The mint reports ${mint.decimals} decimals, but you entered ${submitted}.`,
      fix: submitted === mint.decimals ? undefined : String(mint.decimals),
    })
    return results
  }

  if (caip.namespace !== 'eip155') {
    return [
      {
        id: 'address.deployed',
        field,
        severity: 'warning',
        outcome: 'inconclusive',
        title: deployedTitle,
        message:
          'Automated checks can only verify EVM and Solana addresses. Make sure this is a contract, not a regular wallet.',
      },
    ]
  }

  const chainId = Number(caip.reference)
  if (
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    BigInt(caip.account) < 0x10000n
  )
    return []
  if (!hasPublicRpc(chainId)) {
    return [
      {
        id: 'address.deployed',
        field,
        severity: 'violation',
        outcome: 'inconclusive',
        title: deployedTitle,
        message: `There is no public RPC for ${chain} to check this automatically.`,
      },
    ]
  }

  const address = getAddress(caip.account.toLowerCase())
  const code = await readCodeSnapshot(chainId, address, signal)
  if (code.status !== 'agreed') {
    return [
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
    ]
  }
  const finalized =
    code.values.map((v) => v.finalized).find((v) => v !== null) ?? null
  const latest = code.value.latest
  const results: CheckResult[] = []
  if (!latest && !finalized) {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'violation',
      outcome: 'fail',
      title: deployedTitle,
      message: `There is no contract code at this address on ${chain} (checked with ${pluralize(code.providers.length, 'independent provider')}). The policy only accepts deployed contracts, not wallets (EOAs) or undeployed addresses. Check the address and the selected chain.`,
    })
    return results
  }
  if (code.value.delegatedEoa) {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: deployedTitle,
      message: `This is a wallet (EOA) that delegates to smart-account code through EIP-7702, not a contract. The policy excludes EOAs, so a reviewer may challenge it even though automated checks see code here.`,
    })
    return results
  }
  if (latest && finalized === false) {
    results.push({
      id: 'address.deployed',
      field,
      severity: 'warning',
      outcome: 'fail',
      title: deployedTitle,
      message: `The contract exists but its deployment is not finalized on ${chain} yet. Wait until it is final before submitting; checks that read finalized state would otherwise see no contract.`,
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

  if (draft.registry === 'tokens') {
    const decimalsTitle = 'Decimals match the token contract (decimals())'
    const read = await readTokenDecimals(chainId, address, signal)
    const submitted = parseSubmittedDecimals(draft.values.Decimals ?? '')
    if (read.status !== 'agreed') {
      results.push({
        id: 'tokens.decimals-onchain',
        field: 'Decimals',
        severity: 'violation',
        outcome: 'inconclusive',
        title: decimalsTitle,
        message:
          read.status === 'disagreed'
            ? 'RPC providers disagree about decimals(). Try again in a minute.'
            : `Couldn't read decimals(). ${read.reason}`,
      })
    } else if (read.value.kind === 'unreadable') {
      results.push({
        id: 'tokens.decimals-onchain',
        field: 'Decimals',
        severity: 'warning',
        outcome: 'fail',
        title: decimalsTitle,
        message: `${read.value.reason[0].toUpperCase()}${read.value.reason.slice(1)}. The policy requires EVM tokens to follow ERC-20; make sure this is the token contract.`,
      })
    } else {
      const onchain = read.value.decimals
      results.push({
        id: 'tokens.decimals-onchain',
        field: 'Decimals',
        severity: 'violation',
        outcome:
          submitted === null
            ? 'pending'
            : submitted === onchain
              ? 'pass'
              : 'fail',
        title: decimalsTitle,
        message:
          submitted === null
            ? `The contract reports ${onchain} decimals.`
            : submitted === onchain
              ? undefined
              : `The contract's decimals() returns ${onchain}, but you entered ${submitted}.`,
        fix: submitted === onchain ? undefined : String(onchain),
      })
    }
  }
  return results
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
  const kb = (byteLength / 1024).toFixed(0)
  if (byteLength > LOGO_MAX_BYTES) {
    results.push({
      id: 'tokens.logo-size',
      field,
      severity: 'violation',
      outcome: 'fail',
      title: sizeTitle,
      message: `The logo is ${kb} KB. The policy allows at most 1 MB.`,
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
  results.push(...analyzeAtqSource(ts, lookup.source))
  return results
}
