import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from './useDebouncedValue'
import {
  ADDRESS_FIELD,
  MIN_LOOKUP_COMMIT_LENGTH,
  checkAtqSource,
  checkDuplicates,
  checkTokenLogo,
  compareDecimals,
  isBlocking,
  parseGithubRepository,
  readAddressOnChain,
  runLocalChecks,
  type AddressOnChain,
  type CheckResult,
  type SubmissionDraft,
} from 'utils/checks'

// The compiler is ~9 MB, so it is only fetched when an ATQ module gets checked.
const loadTypeScript = () =>
  import('typescript-5') as unknown as Promise<typeof import('typescript')>

const QUERY_ROOT = 'submission-checks'

/** Network checks run once the input has been still this long. */
const SETTLE_MS = 600
/** GitHub allows 60 lookups an hour, so it waits for a longer pause. */
const GITHUB_SETTLE_MS = 1_500

/**
 * Network-backed rules whose answer can change while the form is open: a
 * contract gets deployed or finalized, a commit pushed, an entry removed.
 * When one fails or could not run, "Check again" is offered and the answer
 * is not kept as fresh.
 */
const RECHECKABLE = new Set([
  'address.deployed',
  'tokens.decimals-onchain',
  'tokens.solana-mint',
  'duplicate',
  'atq.source-resolves',
])

const needsRecheck = (results: readonly CheckResult[] | undefined) =>
  Boolean(
    results?.some(
      (r) =>
        RECHECKABLE.has(r.id) &&
        !r.final &&
        (r.outcome === 'fail' || r.outcome === 'inconclusive'),
    ),
  )

/** Answers stay fresh for `ms`, except failed ones, which are re-read whenever needed again. */
const freshFor =
  (ms: number) =>
  ({ state }: { state: { data?: CheckResult[] | AddressOnChain } }) =>
    needsRecheck(Array.isArray(state.data) ? state.data : state.data?.results)
      ? 0
      : ms

const NETWORK_OPTIONS = {
  retry: false,
  refetchOnWindowFocus: false,
} as const

const fileKey = (file?: File | null) =>
  file ? `${file.name}:${file.size}:${file.lastModified}` : ''

const passed = (results: CheckResult[], id: string) =>
  results.some((r) => r.id === id && r.outcome === 'pass')

interface NetworkCheck {
  /** The check applies to the current input. */
  wanted: boolean
  /** Its query may run (false while it waits for a longer pause). */
  ready?: boolean
  results?: CheckResult[]
  isFetching: boolean
  error: unknown
  refetch: () => unknown
  placeholder: CheckResult
}

/**
 * Runs the pre-submission checks for a draft. Local rules update on every
 * keystroke; network rules (RPCs, GitHub, the registry indexer) run once the
 * input settles and are cached per input.
 *
 * `draft` must be memoized by the caller.
 */
export const useSubmissionChecks = (draft: SubmissionDraft) => {
  const local = useMemo(() => runLocalChecks(draft), [draft])
  const settled = useDebouncedValue(draft, SETTLE_MS)
  const settledLocal = useMemo(() => runLocalChecks(settled), [settled])
  const { registry, values } = settled

  const addressField = ADDRESS_FIELD[registry]
  const address = addressField ? (values[addressField] ?? '') : ''
  const addressValid = passed(settledLocal, 'address.format')

  // Keyed by the address only: the Decimals field is compared in render, so
  // editing it never cancels or repeats the on-chain read.
  const onchainEnabled = addressValid
  const onchain = useQuery({
    queryKey: [QUERY_ROOT, 'onchain', registry, address],
    queryFn: ({ signal }) => readAddressOnChain(settled, signal),
    enabled: onchainEnabled,
    ...NETWORK_OPTIONS,
    staleTime: freshFor(60_000),
  })
  const enteredDecimals = registry === 'tokens' ? (values.Decimals ?? '') : ''
  const onchainResults = useMemo(
    () =>
      onchain.data && [
        ...onchain.data.results,
        ...compareDecimals(onchain.data.decimals, enteredDecimals),
      ],
    [onchain.data, enteredDecimals],
  )

  const duplicateInputs =
    registry === 'tags-queries'
      ? [
          values['Github Repository URL'],
          values['Commit hash'],
          values['EVM Chain ID'],
        ]
      : registry === 'cdn'
        ? [address, values['Domain name']]
        : [address]
  const duplicatesEnabled =
    registry === 'tags-queries'
      ? passed(settledLocal, 'atq.repository-url') &&
        passed(settledLocal, 'atq.commit-hash') &&
        Boolean(values['EVM Chain ID'])
      : addressValid && duplicateInputs.every(Boolean)
  const duplicates = useQuery({
    queryKey: [QUERY_ROOT, 'duplicates', registry, ...duplicateInputs],
    queryFn: () => checkDuplicates(settled),
    enabled: duplicatesEnabled,
    ...NETWORK_OPTIONS,
    staleTime: freshFor(60_000),
  })

  const logo =
    registry === 'tokens' ? (settled.files?.Logo ?? undefined) : undefined
  const logoEnabled = Boolean(logo)
  const logoChecks = useQuery({
    queryKey: [QUERY_ROOT, 'logo', fileKey(logo)],
    queryFn: () => checkTokenLogo(logo as File),
    enabled: logoEnabled,
    ...NETWORK_OPTIONS,
    staleTime: Infinity,
  })

  // One GitHub lookup per repository and commit, whatever the URL's spelling
  // (.git, trailing slash, www.), and only for hashes long enough to be
  // unambiguous: a lookup per keystroke would burn the hourly budget.
  const repository = parseGithubRepository(values['Github Repository URL'])
  const commit = values['Commit hash'] ?? ''
  const atqTarget =
    registry === 'tags-queries' &&
    repository &&
    passed(settledLocal, 'atq.repository-url') &&
    passed(settledLocal, 'atq.commit-hash') &&
    commit.length >= MIN_LOOKUP_COMMIT_LENGTH
      ? `${repository.owner}/${repository.repository}@${commit}`
      : ''
  const githubTarget = useDebouncedValue(
    atqTarget,
    GITHUB_SETTLE_MS - SETTLE_MS,
  )
  const atqWanted = atqTarget !== ''
  const atqReady = atqWanted && githubTarget === atqTarget
  const atq = useQuery({
    queryKey: [QUERY_ROOT, 'atq', atqTarget],
    queryFn: ({ signal }) => checkAtqSource(settled, loadTypeScript, signal),
    enabled: atqReady,
    ...NETWORK_OPTIONS,
    staleTime: freshFor(5 * 60_000),
  })

  const network: NetworkCheck[] = [
    {
      wanted: onchainEnabled,
      ...onchain,
      results: onchainResults,
      placeholder: {
        id: 'address.deployed',
        field: addressField,
        title: 'Checking the address on-chain…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      wanted: duplicatesEnabled,
      ...duplicates,
      results: duplicates.data,
      placeholder: {
        id: 'duplicate',
        title: 'Checking the registry for duplicates…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      wanted: logoEnabled,
      ...logoChecks,
      results: logoChecks.data,
      placeholder: {
        id: 'tokens.logo-png',
        field: 'Logo',
        title: 'Inspecting the logo…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      wanted: atqWanted,
      ready: atqReady,
      ...atq,
      results: atq.data,
      placeholder: {
        id: 'atq.source-resolves',
        field: 'Github Repository URL',
        title: 'Fetching src/main.mts from GitHub…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
  ]

  const networkResults = network.flatMap(
    ({
      wanted,
      ready = true,
      results,
      isFetching,
      error,
      placeholder,
    }): CheckResult[] => {
      if (!wanted) return []
      if (!ready) return [placeholder]
      if (error) {
        return [
          {
            ...placeholder,
            title: placeholder.title.replace(
              /^Checking |^Inspecting |^Fetching |…$/g,
              '',
            ),
            outcome: 'inconclusive',
            message:
              error instanceof Error
                ? error.message
                : 'The check could not run.',
          },
        ]
      }
      return results && !isFetching ? results : [placeholder]
    },
  )

  const results = [...local, ...networkResults].filter(
    (r) => r.outcome !== 'skipped',
  )

  // Anything typed after the last debounce tick has not been checked yet.
  const unsettled = draft !== settled
  const checking =
    unsettled ||
    networkResults.some(
      (r) => r.outcome === 'pending' && r.id !== 'tokens.decimals-onchain',
    )

  const failing = network.filter(
    ({ wanted, ready = true, isFetching, results, error }) =>
      wanted &&
      ready &&
      !isFetching &&
      (Boolean(error) || needsRecheck(results)),
  )

  return {
    results,
    /** A failing `violation` rule: the item is very likely to be challenged. */
    blocking: results.some(isBlocking),
    /** Some checks have not produced an answer for the current input yet. */
    checking,
    /** Re-runs the network checks that failed or could not run; undefined when none did. */
    retry:
      failing.length > 0
        ? () => {
            for (const check of failing) void check.refetch()
          }
        : undefined,
  }
}
