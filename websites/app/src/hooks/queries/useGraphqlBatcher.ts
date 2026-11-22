import { print } from 'graphql'
import type { RequestDocument } from 'graphql-request'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts'

/*
 * Reads from the Scout indexer (Envio HyperIndex), sent together.
 *
 * The indexer counts HTTP requests against a per-minute limit shared by every visitor of Scout
 * and Curate (250 a minute: see its x-ratelimit-* headers). It accepts several queries in one
 * request (an array in, an array out) and counts that request once. A page asks its queries
 * within a few milliseconds of each other, so every query asked within BATCH_WINDOW_MS leaves
 * as one request, and each caller still gets its own answer or its own error.
 *
 * When the indexer refuses or cannot be reached, the next requests wait a moment (longer each
 * time, up to BACKOFF_MAX_MS) instead of every query on the page retrying at once: retries spend
 * the same shared limit. react-query's own retries (three, see app.tsx) run inside these pauses.
 */

const BATCH_WINDOW_MS = 12
const BATCH_MAX = 12
const BACKOFF_START_MS = 1_000
const BACKOFF_MAX_MS = 8_000

/** The indexer answered with an error for this query, or did not answer usefully. */
export class IndexerError extends Error {
  status?: number
  errors?: unknown
  constructor(message: string, detail?: { status?: number; errors?: unknown }) {
    super(message)
    this.name = 'IndexerError'
    this.status = detail?.status
    this.errors = detail?.errors
  }
}

interface Pending {
  /** Query and variables as text: identical reads share one slot. */
  key: string
  query: string
  variables?: Record<string, unknown>
  resolve: (data: any) => void
  reject: (error: unknown) => void
}

interface GraphQLAnswer {
  data?: unknown
  errors?: { message?: string }[]
}

const queue: Pending[] = []
let timer: ReturnType<typeof setTimeout> | undefined
/** No request leaves before this time (after a refusal). */
let pausedUntil = 0
let backoff = 0
/** Set if the endpoint ever answers a batch with something other than an array. */
let arraysUnsupported = false

const post = async (body: unknown): Promise<unknown> => {
  const response = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new IndexerError(`The indexer answered ${response.status}.`, { status: response.status })
  }
  return response.json()
}

const settle = (group: Pending[], answer: GraphQLAnswer | null | undefined) => {
  if (!answer || answer.errors?.length || answer.data === undefined || answer.data === null) {
    const error = new IndexerError(answer?.errors?.[0]?.message ?? 'The indexer returned no data.', {
      errors: answer?.errors,
    })
    for (const item of group) item.reject(error)
  } else {
    for (const item of group) item.resolve(answer.data)
  }
}

/** Sends each slot as its own request; every caller gets its own outcome. Throws if any failed. */
const sendEachAlone = async (groups: Pending[][]) => {
  const results = await Promise.allSettled(
    groups.map(async (group) => {
      const [first] = group
      settle(group, (await post({ query: first.query, variables: first.variables })) as GraphQLAnswer)
    }),
  )
  let failure: unknown
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      failure = failure ?? result.reason
      for (const item of groups[index]) item.reject(result.reason)
    }
  })
  if (failure !== undefined) throw failure
}

const schedule = (delay: number) => {
  if (timer !== undefined) return
  const wait = Math.max(delay, pausedUntil - Date.now())
  timer = setTimeout(() => {
    timer = undefined
    void flush()
  }, wait)
}

const flush = async () => {
  const batch = queue.splice(0, BATCH_MAX)
  if (queue.length > 0) schedule(0)
  if (batch.length === 0) return

  // Identical reads (two components asking the same thing) travel once.
  const slots = new Map<string, Pending[]>()
  for (const item of batch) {
    const slot = slots.get(item.key)
    if (slot) slot.push(item)
    else slots.set(item.key, [item])
  }
  const groups = Array.from(slots.values())

  try {
    if (groups.length === 1 || arraysUnsupported) {
      await sendEachAlone(groups)
    } else {
      const answers = await post(
        groups.map(([first]) => ({ query: first.query, variables: first.variables })),
      )
      if (Array.isArray(answers) && answers.length === groups.length) {
        groups.forEach((group, index) => settle(group, answers[index] as GraphQLAnswer))
      } else {
        // This endpoint does not take arrays: ask each query on its own from now on.
        arraysUnsupported = true
        await sendEachAlone(groups)
      }
    }
    backoff = 0
  } catch (error) {
    // Refused (a rate limit reads as a failed fetch in the browser) or unreachable: hold the
    // next requests back before asking again. Callers already received their own error. Only a
    // failure after the last pause has run out lengthens it: several reads failing together are
    // one outage, so the pause stays within seconds instead of compounding to minutes.
    if (Date.now() >= pausedUntil) {
      backoff = Math.min(BACKOFF_MAX_MS, backoff ? backoff * 2 : BACKOFF_START_MS)
      pausedUntil = Date.now() + backoff
    }
    for (const group of groups) for (const item of group) item.reject(error)
  }
}

/** Sends one read to the Scout indexer, batched with any other read asked at the same moment. */
export const indexerRequest = <T = any>(
  document: RequestDocument,
  variables?: Record<string, unknown>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const query = typeof document === 'string' ? document : print(document)
    queue.push({
      key: `${query}\n${JSON.stringify(variables ?? {})}`,
      query,
      variables,
      resolve,
      reject,
    })
    if (queue.length >= BATCH_MAX && pausedUntil <= Date.now()) {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      void flush()
    } else schedule(BATCH_WINDOW_MS)
  })

const graphqlBatcher = {
  /** `id` only labels the read for debugging; identical reads are shared whatever their id. */
  request: (_id: string, document: RequestDocument, variables?: any): Promise<any> =>
    indexerRequest(document, variables),
}

export const useGraphqlBatcher = () => {
  return graphqlBatcher
}
