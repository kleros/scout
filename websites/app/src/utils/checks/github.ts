/**
 * Minimal unauthenticated GitHub reader for the Address Tags Query checks.
 *
 * Browser-safe: api.github.com and raw.githubusercontent.com both answer with
 * `Access-Control-Allow-Origin: *`. The REST API allows 60 unauthenticated
 * requests per hour per IP, so a full check costs two API calls plus one raw
 * download, and rate limiting is reported distinctly from "not found".
 */

import { withDeadline } from './deadline'

const TIMEOUT_MS = 20_000

export interface GithubRepoRef {
  owner: string
  repository: string
}

/**
 * Parses the repository URL like the automated checks do: HTTPS,
 * github.com or www.github.com, and exactly two non-empty path segments
 * (`.git` suffix, trailing slash, query and fragment are tolerated).
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

export interface PinnedSourceLookup {
  repositoryStatus: number
  commitStatus: number
  sourceStatus: number
  /** Canonical repository name as GitHub reports it (after renames). */
  canonicalName?: string
  resolvedCommit?: string
  source?: string
}

// Content at a commit never changes, so successful lookups are kept for the
// session to spare the 60-per-hour API budget. "Not found" is not cached: the
// submitter may push the commit and check again.
const lookups = new Map<string, PinnedSourceLookup>()

/** The three lookups the automated checks perform, in parallel. */
export const lookupPinnedSource = async (
  ref: GithubRepoRef,
  commit: string,
  signal?: AbortSignal,
): Promise<PinnedSourceLookup> => {
  const key = `${ref.owner}/${ref.repository}@${commit}`.toLowerCase()
  const hit = lookups.get(key)
  if (hit) return hit
  // One deadline for the three requests and their bodies.
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
  const [repositoryResponse, commitResponse, sourceResponse] =
    await Promise.all([
      get(
        `https://api.github.com/repos/${base}`,
        'application/vnd.github+json',
        signal,
      ),
      get(
        `https://api.github.com/repos/${base}/commits/${encodeURIComponent(commit)}`,
        'application/vnd.github+json',
        signal,
      ),
      get(
        `https://raw.githubusercontent.com/${base}/${encodeURIComponent(commit)}/src/main.mts`,
        'text/plain',
        signal,
      ),
    ])
  const lookup: PinnedSourceLookup = {
    repositoryStatus: repositoryResponse.status,
    commitStatus: commitResponse.status,
    sourceStatus: sourceResponse.status,
  }
  if (repositoryResponse.ok)
    lookup.canonicalName = (await repositoryResponse.json())?.name
  if (commitResponse.ok)
    lookup.resolvedCommit = (await commitResponse.json())?.sha
  if (sourceResponse.ok) lookup.source = await sourceResponse.text()
  return lookup
}
