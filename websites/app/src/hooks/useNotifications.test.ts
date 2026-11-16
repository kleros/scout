import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import { UserRejectedRequestError } from 'viem'
import {
  accountKey,
  afterSignIn,
  afterSignOut,
  offeredChannels,
  readsSaved,
  signatureError,
} from './useNotifications'

const A = `0x${'aa'.repeat(20)}`
const B = `0x${'bb'.repeat(20)}`
const signedIn = (address: string) => ({ signedIn: true, address })

describe('notification caches', () => {
  it("never serves one account's reads or follows to the next", async () => {
    const queryClient = new QueryClient()
    afterSignIn(queryClient, signedIn(A))
    queryClient.setQueryData(accountKey(A, 'reads'), { reads: { x: 1 } })
    queryClient.setQueryData(accountKey(A, 'follows'), { follows: [] })
    afterSignOut(queryClient)
    afterSignIn(queryClient, signedIn(B))
    let fetches = 0
    const reads = await queryClient.fetchQuery({
      queryKey: accountKey(B, 'reads'),
      queryFn: async () => {
        fetches += 1
        return { reads: {} }
      },
      staleTime: 30_000,
    })
    assert.equal(fetches, 1)
    assert.deepEqual(reads, { reads: {} })
    assert.equal(queryClient.getQueryData(accountKey(A, 'reads')), undefined)
    assert.equal(queryClient.getQueryData(accountKey(A, 'follows')), undefined)
  })

  it('drops an answer still on its way for the previous account', async () => {
    const queryClient = new QueryClient()
    afterSignIn(queryClient, signedIn(A))
    let answer!: (value: unknown) => void
    const loading = queryClient.fetchQuery({
      queryKey: accountKey(A, 'reads'),
      queryFn: () => new Promise((resolve) => (answer = resolve)),
    })
    // Switching accounts without signing out first, too.
    afterSignIn(queryClient, signedIn(B))
    answer({ reads: { x: 1 } })
    await loading.catch(() => undefined)
    assert.equal(queryClient.getQueryData(accountKey(A, 'reads')), undefined)
    assert.equal(queryClient.getQueryData(accountKey(B, 'reads')), undefined)
  })

  it('ignores a save that completes after the account changed', () => {
    const queryClient = new QueryClient()
    afterSignIn(queryClient, signedIn(B))
    readsSaved(queryClient, A, { reads: { x: 1 }, alertsRead: 1 })
    assert.equal(queryClient.getQueryData(accountKey(A, 'reads')), undefined)
    assert.equal(queryClient.getQueryData(accountKey(B, 'reads')), undefined)
    readsSaved(queryClient, B, { reads: { y: 2 }, alertsRead: 0 })
    assert.deepEqual(queryClient.getQueryData(accountKey(B, 'reads')), {
      reads: { y: 2 },
    })
    // Whether the server keeps the account's reads comes along.
    readsSaved(queryClient, B, { reads: {}, alertsRead: 0, synced: false })
    assert.deepEqual(queryClient.getQueryData(accountKey(B, 'reads')), {
      reads: {},
      synced: false,
    })
  })

  it('forgets every account once signed out or deleted', () => {
    const queryClient = new QueryClient()
    afterSignIn(queryClient, signedIn(A))
    queryClient.setQueryData(accountKey(A, 'inbox'), { notifications: [] })
    afterSignOut(queryClient)
    assert.equal(queryClient.getQueryData(accountKey(A, 'inbox')), undefined)
  })
})

describe('notification wording', () => {
  it("tells the user they cancelled, never the wallet library's error text", () => {
    const rejected = new UserRejectedRequestError(new Error('User denied.'))
    assert.equal(signatureError(rejected).message, 'You cancelled the sign-in.')
    // Wrapped, as wagmi and some wallets do.
    assert.equal(
      signatureError(
        Object.assign(new Error('Signing failed'), { cause: { code: 4001 } }),
      ).message,
      'You cancelled the sign-in.',
    )
    const other = signatureError(
      new Error('Details: internal error. Version: viem@2.46.1'),
    ).message
    assert.doesNotMatch(other, /viem|Details/)
    assert.match(other, /could not sign/)
  })

  it('promises only the channels this deployment offers', () => {
    const channels = (email: boolean, telegram: boolean, push: boolean) =>
      offeredChannels({
        email,
        telegram: telegram ? { bot: 'scout_bot' } : null,
        push: push ? { publicKey: 'key' } : null,
      })
    assert.equal(
      channels(true, true, true),
      'email, Telegram or browser notifications',
    )
    assert.equal(channels(true, false, true), 'email or browser notifications')
    assert.equal(channels(false, true, false), 'Telegram')
    assert.equal(channels(false, false, false), null)
  })
})
