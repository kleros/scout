/**
 * Minimal unauthenticated GitHub reader for the Address Tags Query checks.
 *
 * Browser-safe: api.github.com and raw.githubusercontent.com both answer with
 * `Access-Control-Allow-Origin: *`. The REST API allows 60 unauthenticated
 * requests per hour per IP, so a check costs one API call for the commit
 * (plus one per repository, cached) and one raw download, and rate limiting
 * is reported distinctly from "not found".
 */

import { withDeadline } from './deadline'
import { MAX_SOURCE_BYTES } from './atqSource'

const TIMEOUT_MS = 20_000
/** Repository answers (its canonical name) are reused this long. */
const REPOSITORY_TTL_MS = 10 * 60_000

/** Hashes shorter than this can be ambiguous and are not looked up. */
export const MIN_LOOKUP_COMMIT_LENGTH = 7

export interface GithubRepoRef {
  owner: string
  repository: string
}

/**
 * Parses the repository URL: HTTPS, github.com or www.github.com, and
 * exactly two non-empty path segments (`.git` suffix, trailing slash, query
 * and fragment are tolerated).
 */
export const parseGithubRepository = (
  repositoryUrl: unknown,
): GithubRepoRef | null => {
  if (typeof repositoryUrl !== 'string') return null
  try {
    const parsed = new URL(repositoryUrl)
    const hostname = parsed.hostname.toLowerCase()
    if (
      parsed.protocol !== 'https:' ||
      !['github.com', 'www.github.com'].includes(hostname)
    )
      return null
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    return { owner: parts[0], repository: parts[1].replace(/\.git$/i, '') }
  } catch {
    return null
  }
}

export const isCommitHash = (value: unknown): boolean =>
  typeof value === 'string' && /^[0-9a-fA-F]{1,40}$/.test(value)

export const isKebabCase = (name: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)

export class GithubRateLimitError extends Error {
  resetAt?: Date

  constructor(resetAt?: Date) {
    super(
      resetAt
        ? `GitHub's hourly limit for unauthenticated checks was reached. Try again after ${resetAt.toLocaleTimeString()}.`
        : "GitHub's hourly limit for unauthenticated checks was reached. Try again later.",
    )
    this.resetAt = resetAt
  }
}

const get = async (
  url: string,
  accept: string,
  signal: AbortSignal,
): Promise<Response> => {
  const response = await fetch(url, { headers: { Accept: accept }, signal })
  if (
    (response.status === 403 || response.status === 429) &&
    response.headers.get('x-ratelimit-remaining') === '0'
  ) {
    const reset = Number(response.headers.get('x-ratelimit-reset'))
    throw new GithubRateLimitError(
      Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : undefined,
    )
  }
  return response
}

/**
 * The body as text, reading at most `limit` bytes: a file bigger than any
 * real module is never downloaded whole. `truncated` when there was more.
 */
export const readTextUpTo = async (
  response: Response,
  limit: number,
): Promise<{ text: string; truncated: boolean }> => {
  // The declared length settles it before reading anything, when present.
  const declared = Number(response.headers.get('content-length'))
  const tooLarge = Number.isFinite(declared) && declared > limit
  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    return text.length > limit
      ? { text: text.slice(0, limit), truncated: true }
      : { text, truncated: tooLarge }
  }
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = tooLarge
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
    if (size > limit) {
      truncated = true
      break
    }
  }
  if (truncated) await reader.cancel().catch(() => undefined)
  const bytes = new Uint8Array(Math.min(size, limit))
  let offset = 0
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset)
    bytes.set(part, offset)
    offset += part.length
    if (offset === bytes.length) break
  }
  return { text: new TextDecoder().decode(bytes), truncated }
}

export interface PinnedSourceLookup {
  repositoryStatus: number
  commitStatus: number
  sourceStatus: number
  /** Canonical repository name as GitHub reports it (after renames). */
  canonicalName?: string
  resolvedCommit?: string
  source?: string
  /** Only the first MAX_SOURCE_BYTES of src/main.mts were read. */
  sourceTruncated?: boolean
}

// Content at a commit never changes, so successful lookups are kept for the
// session to spare the 60-per-hour API budget. A repository that exists is
// remembered for a while, so trying several commits of it costs one API call
// each. "Not found" is never cached: the submitter may push the commit (or
// publish the repository) and check again.
const lookups = new Map<string, PinnedSourceLookup>()
const repositories = new Map<string, { at: number; name?: string }>()

/** The repository, commit and file lookups for one pinned module, in parallel. */
export const lookupPinnedSource = async (
  ref: GithubRepoRef,
  commit: string,
  signal?: AbortSignal,
): Promise<PinnedSourceLookup> => {
  const key = `${ref.owner}/${ref.repository}@${commit}`.toLowerCase()
  const hit = lookups.get(key)
  if (hit) return hit
  // One deadline for the requests and their bodies.
  const lookup = await withDeadline(signal, TIMEOUT_MS, (signal) =>
    fetchPinnedSource(ref, commit, signal),
  )
  if (
    lookup.repositoryStatus === 200 &&
    lookup.commitStatus === 200 &&
    lookup.sourceStatus === 200
  ) {
    lookups.set(key, lookup)
  }
  return lookup
}

const fetchPinnedSource = async (
  { owner, repository }: GithubRepoRef,
  commit: string,
  signal: AbortSignal,
): Promise<PinnedSourceLookup> => {
  const base = `${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
  const repositoryKey = `${owner}/${repository}`.toLowerCase()
  const known = repositories.get(repositoryKey)
  const knownRepository =
    known && Date.now() - known.at < REPOSITORY_TTL_MS ? known : undefined
  const [repositoryResponse, commitResponse, sourceResponse] =
    await Promise.all([
      knownRepository
        ? undefined
        : get(
            `https://api.github.com/repos/${base}`,
            'application/vnd.github+json',
            signal,
          ),
      // The `sha` media type answers with the commit's full hash only, not
      // its diff.
      get(
        `https://api.github.com/repos/${base}/commits/${encodeURIComponent(commit)}`,
        'application/vnd.github.sha',
        signal,
      ),
      get(
        `https://raw.githubusercontent.com/${base}/${encodeURIComponent(commit)}/src/main.mts`,
        'text/plain',
        signal,
      ),
    ])
  const lookup: PinnedSourceLookup = {
    repositoryStatus: repositoryResponse?.status ?? 200,
    commitStatus: commitResponse.status,
    sourceStatus: sourceResponse.status,
    canonicalName: knownRepository?.name,
  }
  if (repositoryResponse?.ok) {
    lookup.canonicalName = (await repositoryResponse.json())?.name
    repositories.set(repositoryKey, {
      at: Date.now(),
      name: lookup.canonicalName,
    })
  }
  if (commitResponse.ok) {
    const sha = (await commitResponse.text()).trim()
    if (/^[0-9a-f]{40}$/i.test(sha)) lookup.resolvedCommit = sha
  }
  if (sourceResponse.ok) {
    const { text, truncated } = await readTextUpTo(
      sourceResponse,
      MAX_SOURCE_BYTES,
    )
    lookup.source = text
    if (truncated) lookup.sourceTruncated = true
  }
  return lookup
}
