import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from './useDebouncedValue'
import {
  ADDRESS_FIELD,
  checkAddressOnChain,
  checkAtqSource,
  checkDuplicates,
  checkTokenLogo,
  isBlocking,
  runLocalChecks,
  type CheckResult,
  type SubmissionDraft,
} from 'utils/checks'

// The compiler is ~9 MB, so it is only fetched when an ATQ module gets checked.
const loadTypeScript = () =>
  import('typescript-5') as unknown as Promise<typeof import('typescript')>

const QUERY_ROOT = 'submission-checks'

const NETWORK_OPTIONS = {
  retry: false,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
} as const

const fileKey = (file?: File | null) =>
  file ? `${file.name}:${file.size}:${file.lastModified}` : ''

const passed = (results: CheckResult[], id: string) =>
  results.some((r) => r.id === id && r.outcome === 'pass')

interface NetworkCheck {
  enabled: boolean
  data?: CheckResult[]
  isFetching: boolean
  error: unknown
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
  const queryClient = useQueryClient()
  const local = useMemo(() => runLocalChecks(draft), [draft])
  const settled = useDebouncedValue(draft, 600)
  const settledLocal = useMemo(() => runLocalChecks(settled), [settled])
  const { registry, values } = settled

  const addressField = ADDRESS_FIELD[registry]
  const address = addressField ? (values[addressField] ?? '') : ''
  const addressValid = passed(settledLocal, 'address.format')

  const onchainEnabled = addressValid
  const onchain = useQuery({
    queryKey: [
      QUERY_ROOT,
      'onchain',
      registry,
      address,
      registry === 'tokens' ? values.Decimals : '',
    ],
    queryFn: ({ signal }) => checkAddressOnChain(settled, signal),
    enabled: onchainEnabled,
    ...NETWORK_OPTIONS,
  })

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

  const repository = values['Github Repository URL'] ?? ''
  const commit = values['Commit hash'] ?? ''
  const atqEnabled =
    registry === 'tags-queries' &&
    passed(settledLocal, 'atq.repository-url') &&
    passed(settledLocal, 'atq.commit-hash')
  const atq = useQuery({
    queryKey: [QUERY_ROOT, 'atq', repository, commit],
    queryFn: ({ signal }) => checkAtqSource(settled, loadTypeScript, signal),
    enabled: atqEnabled,
    ...NETWORK_OPTIONS,
    staleTime: 5 * 60_000,
  })

  const network: NetworkCheck[] = [
    {
      enabled: onchainEnabled,
      ...onchain,
      placeholder: {
        id: 'address.deployed',
        field: addressField,
        title: 'Checking the address on-chain…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      enabled: duplicatesEnabled,
      ...duplicates,
      placeholder: {
        id: 'duplicate',
        title: 'Checking the registry for duplicates…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      enabled: logoEnabled,
      ...logoChecks,
      placeholder: {
        id: 'tokens.logo-png',
        field: 'Logo',
        title: 'Inspecting the logo…',
        severity: 'violation',
        outcome: 'pending',
      },
    },
    {
      enabled: atqEnabled,
      ...atq,
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
    ({ enabled, data, isFetching, error, placeholder }): CheckResult[] => {
      if (!enabled) return []
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
      return data && !isFetching ? data : [placeholder]
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

  const retry = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [QUERY_ROOT] }),
    [queryClient],
  )

  return {
    results,
    /** A failing `violation` rule: submitting would get the item challenged. */
    blocking: results.some(isBlocking),
    /** Some checks have not produced an answer for the current input yet. */
    checking,
    retry,
  }
}
