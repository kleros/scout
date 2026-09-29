import { withDeadline } from './deadline'
import { PUBLIC_RPC_URLS, RpcError, readWithQuorum } from './rpc'

/** Code at the chain's finalized block (when the node supports that tag) and at its latest block. */
export interface CodeSnapshot {
  finalized: boolean | null
  latest: boolean
  /** The only code is an EIP-7702 delegation designator: a wallet (EOA), not a contract. */
  delegatedEoa: boolean
}

// EIP-7702: an EOA that delegates to a contract reports `0xef0100 || address` as its code.
const DELEGATION_DESIGNATOR = /^0xef0100[0-9a-fA-F]{40}$/

const RPC_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 60_000

// Answers are reused for a minute so editing another field (e.g. Decimals)
// re-evaluates the rules without hitting the RPCs again. Failed reads are not
// cached, so a retry really retries.
const cache = new Map<string, { at: number; value: Promise<unknown> }>()
const cached = <T>(key: string, read: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as Promise<T>
  const value = read()
  cache.set(key, { at: Date.now(), value })
  value.then(
    (result) => {
      if ((result as { status?: string })?.status !== 'agreed')
        cache.delete(key)
    },
    () => cache.delete(key),
  )
  return value
}

/** POSTs a JSON-RPC payload and returns the parsed answer, within RPC_TIMEOUT_MS. */
const post = (
  url: string,
  payload: unknown,
  signal?: AbortSignal,
  provider = new URL(url).hostname,
): Promise<any> =>
  withDeadline(signal, RPC_TIMEOUT_MS, async (signal) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
    if (!response.ok)
      throw new Error(`HTTP ${response.status} from ${provider}`)
    return response.json()
  })

const batch = async (
  url: string,
  calls: { method: string; params: unknown[] }[],
  signal?: AbortSignal,
) => {
  const body = await post(
    url,
    calls.map((call, id) => ({ jsonrpc: '2.0', id, ...call })),
    signal,
  )
  if (!Array.isArray(body))
    throw new Error(`${new URL(url).hostname} does not support batch requests`)
  return calls.map((_, id) =>
    body.find((entry: { id: number }) => entry?.id === id),
  )
}

const isHex = (value: unknown): value is string =>
  typeof value === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(value)
const hasCode = (code: string) => code !== '0x' && code !== '0x0'

/**
 * Whether bytecode exists at `address`, from two independent providers.
 * Finalized state is what the automated checks read; latest state tells
 * apart "not deployed" from "deployed but not final yet".
 */
export const readCodeSnapshot = (
  chainId: number,
  address: string,
  signal?: AbortSignal,
) =>
  cached(`code:${chainId}:${address.toLowerCase()}`, () =>
    readWithQuorum<CodeSnapshot>(
      chainId,
      async (url) => {
        const [finalized, latest] = await batch(
          url,
          [
            { method: 'eth_getCode', params: [address, 'finalized'] },
            { method: 'eth_getCode', params: [address, 'latest'] },
          ],
          signal,
        )
        if (!isHex(latest?.result))
          throw new Error(
            latest?.error?.message ?? 'eth_getCode returned no bytecode field',
          )
        return {
          // Some nodes predate the `finalized` tag; treat that as "unknown".
          finalized: isHex(finalized?.result)
            ? hasCode(finalized.result)
            : null,
          latest: hasCode(latest.result),
          delegatedEoa: DELEGATION_DESIGNATOR.test(latest.result),
        }
      },
      (a, b) =>
        a.latest === b.latest &&
        a.delegatedEoa === b.delegatedEoa &&
        (a.finalized === null ||
          b.finalized === null ||
          a.finalized === b.finalized),
    ),
  )

const DECIMALS_SELECTOR = '0x313ce567'

export type DecimalsRead =
  | { kind: 'value'; decimals: number }
  | { kind: 'unreadable'; reason: string }

/** `decimals()` from two independent providers at the latest block. */
export const readTokenDecimals = (
  chainId: number,
  address: string,
  signal?: AbortSignal,
) =>
  cached(`decimals:${chainId}:${address.toLowerCase()}`, () =>
    readWithQuorum<DecimalsRead>(
      chainId,
      async (url) => {
        const body = await post(
          url,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: address, data: DECIMALS_SELECTOR }, 'latest'],
          },
          signal,
        )
        if (body?.error) {
          // A revert is an answer about the contract, not a transport failure.
          const message = String(body.error.message ?? '')
          if (/revert|execution/i.test(message))
            return { kind: 'unreadable', reason: 'decimals() reverted' }
          throw new RpcError(message, body.error.code)
        }
        const raw = body?.result
        if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(raw)) {
          return {
            kind: 'unreadable',
            reason: 'decimals() did not return a single uint8 value',
          }
        }
        const value = BigInt(raw)
        if (value > 255n)
          return {
            kind: 'unreadable',
            reason: 'decimals() returned a value above 255',
          }
        return { kind: 'value', decimals: Number(value) }
      },
      (a, b) =>
        a.kind === b.kind &&
        (a.kind !== 'value' ||
          (b.kind === 'value' && a.decimals === b.decimals)),
    ),
  )

export const hasPublicRpc = (chainId: number) =>
  Boolean(PUBLIC_RPC_URLS[chainId]?.length)

const SOLANA_RPC = 'https://solana-rpc.publicnode.com'
const SPL_TOKEN_PROGRAMS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
])

export type SolanaMintRead =
  | { kind: 'missing' }
  | { kind: 'not-token-program'; owner: string }
  | { kind: 'not-mint'; type: string }
  | { kind: 'mint'; decimals: number }

/** Solana mint lookup (single public provider; automated checks only flag these for review). */
export const readSolanaMint = async (
  account: string,
  signal?: AbortSignal,
): Promise<SolanaMintRead> => {
  const body = await post(
    SOLANA_RPC,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [account, { commitment: 'finalized', encoding: 'jsonParsed' }],
    },
    signal,
    'the Solana RPC',
  )
  if (body?.error)
    throw new RpcError(
      body.error.message ?? 'Solana RPC error',
      body.error.code,
    )
  const value = body?.result?.value
  if (!value) return { kind: 'missing' }
  if (!SPL_TOKEN_PROGRAMS.has(value.owner))
    return { kind: 'not-token-program', owner: String(value.owner) }
  const parsed = value.data?.parsed
  if (parsed?.type !== 'mint')
    return { kind: 'not-mint', type: String(parsed?.type ?? 'unknown') }
  return { kind: 'mint', decimals: Number(parsed.info?.decimals) }
}
