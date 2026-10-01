import { useEffect, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useAccount, useSignMessage } from 'wagmi'
import { createSiweMessage } from 'viem/siwe'

/**
 * Client for the Scout notification service (Netlify Functions under
 * /api/notify). Everything degrades to "unavailable" when the service is not
 * deployed (e.g. plain `vite` dev server) or not configured.
 */

const BASE = '/api/notify'

export class NotifyApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const api = async <T>(
  path: string,
  init?: RequestInit & {
    json?: unknown
    /** The account this is for: the server refuses it if another is signed in. */
    account?: string
  },
): Promise<T> => {
  const headers: Record<string, string> = {}
  if (init?.json !== undefined) headers['Content-Type'] = 'application/json'
  if (init?.account) headers['X-Notify-Account'] = init.account
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  })
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const data = isJson ? await response.json() : null
  if (!response.ok || !isJson) {
    throw new NotifyApiError(
      data?.error ?? `Notification service answered HTTP ${response.status}.`,
      response.status,
    )
  }
  return data as T
}

export type ChannelLevel = 'all' | 'important' | 'urgent' | 'off'
export type NotifyChannel = 'email' | 'telegram' | 'push'
export type NotifyCategory =
  | 'periods'
  | 'funding'
  | 'receipts'
  | 'rewards'
  | 'follows'

export interface NotifyPreferences {
  channels: Record<NotifyChannel, ChannelLevel>
  categories: Record<NotifyCategory, boolean>
}

export interface NotifyConfig {
  channels: {
    email: boolean
    telegram: { bot: string } | null
    push: { publicKey: string } | null
  }
  maxWatchedAddresses: number
}

export interface NotifyProfile {
  signedIn: boolean
  address?: string
  preferences?: NotifyPreferences
  email?: { address: string; verified: boolean; unsubscribed: boolean } | null
  telegram?: { connected: boolean; username: string | null }
  push?: { devices: number; endpoints: string[] }
  watchedAddresses?: string[]
  unread?: number
}

export interface InboxNotification {
  id: number
  kind: string
  urgency: 'urgent' | 'important' | 'soft'
  title: string
  body: string
  url: string | null
  itemId: string | null
  deadline: string | null
  createdAt: string
  read: boolean
}

const KEYS = {
  config: ['notify', 'config'],
  me: ['notify', 'me'],
  /** Everything else is kept per signed-in account. */
  accounts: ['notify', 'account'],
} as const

export const accountKey = (
  account: string,
  name?: 'inbox' | 'follows' | 'reads',
) => [...KEYS.accounts, account.toLowerCase(), ...(name ? [name] : [])]

/** The signed-in account, as the latest profile says. */
const signedInAccount = (queryClient: QueryClient) =>
  queryClient.getQueryData<NotifyProfile>(KEYS.me)?.address

/**
 * Drops the cached data of every account but `keep`, cancelling requests
 * still running for them, so nothing of one account shows for another.
 */
const dropAccounts = (queryClient: QueryClient, keep?: string) => {
  const filters = {
    queryKey: KEYS.accounts,
    predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[2] !== keep?.toLowerCase(),
  }
  queryClient.cancelQueries(filters)
  queryClient.removeQueries(filters)
}

/** After signing in: only the new account's data stays, and it is refetched. */
export const afterSignIn = (
  queryClient: QueryClient,
  profile: NotifyProfile,
) => {
  queryClient.setQueryData(KEYS.me, { ...profile, signedIn: true })
  dropAccounts(queryClient, profile.address)
  if (profile.address)
    queryClient.invalidateQueries({ queryKey: accountKey(profile.address) })
}

/** After signing out or deleting the account: no account's data stays. */
export const afterSignOut = (queryClient: QueryClient) => {
  queryClient.setQueryData(KEYS.me, { signedIn: false })
  dropAccounts(queryClient)
}

/**
 * Calls the API for `account`. The server refuses once another wallet is
 * signed in (say, in another tab); the profile is then reloaded.
 */
const accountApi = async <T>(
  queryClient: QueryClient,
  account: string | undefined,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> => {
  try {
    return await api<T>(path, { ...init, account })
  } catch (error) {
    if (error instanceof NotifyApiError && error.status === 409)
      queryClient.invalidateQueries({ queryKey: KEYS.me })
    throw error
  }
}

export const useNotifyConfig = () =>
  useQuery({
    queryKey: KEYS.config,
    queryFn: () => api<NotifyConfig>('/config'),
    staleTime: Infinity,
    retry: false,
  })

/**
 * The signed-in profile. Linking Telegram and confirming an email finish in
 * another tab or app, so it is read again when this tab regains focus.
 */
export const useNotifyProfile = () => {
  const config = useNotifyConfig()
  return useQuery({
    queryKey: KEYS.me,
    queryFn: () => api<NotifyProfile>('/me'),
    enabled: config.isSuccess,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

const SIGN_IN_STATEMENT =
  'Sign in to manage your Kleros Scout notifications. This is free: it sends no transaction and grants no permissions.'

export const useNotifySignIn = () => {
  const queryClient = useQueryClient()
  const { address, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect your wallet first.')
      const { nonce } = await api<{ nonce: string }>('/auth/nonce')
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: SIGN_IN_STATEMENT,
        uri: window.location.origin,
        version: '1',
        chainId: chainId ?? 100,
        nonce,
        issuedAt: new Date(),
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
      })
      const signature = await signMessageAsync({ message })
      return api<NotifyProfile>('/auth/verify', {
        method: 'POST',
        json: { message, signature },
      })
    },
    onSuccess: (profile) => afterSignIn(queryClient, profile),
  })
}

type AccountCall = <T>(
  path: string,
  init?: RequestInit & { json?: unknown },
) => Promise<T>

/**
 * A mutation on the signed-in profile, made for the account the profile
 * shows when it runs; it refreshes the profile afterwards.
 */
const useAction = <V = void, R = unknown>(
  fn: (variables: V, call: AccountCall) => Promise<R>,
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: V) =>
      fn(variables, (path, init) =>
        accountApi(queryClient, signedInAccount(queryClient), path, init),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.me }),
  })
}

/** Mutations on the signed-in profile; each refreshes the profile afterwards. */
export const useNotifyActions = () => {
  const queryClient = useQueryClient()
  return {
    signOut: useAction(async () => {
      await api('/auth/logout', { method: 'POST', json: {} })
      afterSignOut(queryClient)
    }),
    deleteAccount: useAction(async (_: void, call) => {
      await call('/me', { method: 'DELETE', json: {} })
      afterSignOut(queryClient)
    }),
    updatePreferences: useAction((update: Partial<NotifyPreferences>, call) =>
      call('/me/preferences', { method: 'PUT', json: update }),
    ),
    setEmail: useAction((email: string, call) =>
      call('/me/email', { method: 'PUT', json: { email } }),
    ),
    removeEmail: useAction((_: void, call) =>
      call('/me/email', { method: 'DELETE', json: {} }),
    ),
    unlinkTelegram: useAction((_: void, call) =>
      call('/me/telegram', { method: 'DELETE', json: {} }),
    ),
    addWatched: useAction((address: string, call) =>
      call('/me/watched', { method: 'POST', json: { address } }),
    ),
    removeWatched: useAction((address: string, call) =>
      call(`/me/watched/${encodeURIComponent(address)}`, {
        method: 'DELETE',
        json: {},
      }),
    ),
    enablePush: useAction((publicKey: string, call) =>
      subscribeToPush(publicKey, call),
    ),
    disablePush: useAction((_: void, call) => unsubscribeFromPush(call)),
  }
}

/** How long a Telegram link stays valid: TELEGRAM_TOKEN_TTL_MS on the server. */
const TELEGRAM_LINK_TTL_MS = 15 * 60 * 1000

/**
 * Connects Telegram. The link completes in Telegram, outside Scout, so while
 * it is open the profile is read every few seconds until it shows the chat.
 * `command` is what to send the bot by hand where the link can't open the
 * app, as on Telegram Web.
 */
export const useTelegramLink = () => {
  const [open, setOpen] = useState<{
    account: string
    command: string
    until: number
  } | null>(null)
  const { data, dataUpdatedAt, errorUpdatedAt, refetch } = useNotifyProfile()
  const account = data?.signedIn ? data.address : undefined
  const connected = Boolean(data?.telegram?.connected)
  const waiting = open !== null && !connected
  useEffect(() => {
    if (!open) return
    // Done, or signed out or into another account meanwhile.
    if (connected || account !== open.account) {
      setOpen(null)
      return
    }
    const expire = setTimeout(() => setOpen(null), open.until - Date.now())
    return () => clearTimeout(expire)
  }, [open, connected, account])
  // Asks again a few seconds after each answer while waiting.
  useEffect(() => {
    if (!waiting) return
    const next = setTimeout(() => refetch(), 3_000)
    return () => clearTimeout(next)
  }, [waiting, dataUpdatedAt, errorUpdatedAt, refetch])
  const link = useAction((_: void, call) =>
    call<{ url: string }>('/me/telegram', { method: 'POST', json: {} }),
  )
  return {
    /** Opens a link for the signed-in account and returns its t.me URL. */
    start: async () => {
      const forAccount = account
      const { url } = await link.mutateAsync()
      if (forAccount) {
        setOpen({
          account: forAccount,
          command: `/start ${new URL(url).searchParams.get('start')}`,
          until: Date.now() + TELEGRAM_LINK_TTL_MS,
        })
      }
      return url
    },
    isPending: link.isPending,
    command: waiting ? open.command : null,
  }
}

/** The signed-in account's alerts; `account` is the profile's address. */
export const useNotificationsInbox = (account: string | undefined) => {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: accountKey(account ?? '', 'inbox'),
    queryFn: () =>
      accountApi<{ notifications: InboxNotification[]; unread: number }>(
        queryClient,
        account,
        '/me/notifications?limit=30',
      ),
    enabled: Boolean(account),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

export const useMarkRead = (account: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids?: number[]) =>
      accountApi<{ unread: number }>(
        queryClient,
        account,
        '/me/notifications/read',
        { method: 'POST', json: { ids } },
      ),
    onSuccess: () => {
      if (account)
        queryClient.invalidateQueries({
          queryKey: accountKey(account, 'inbox'),
        })
      queryClient.invalidateQueries({ queryKey: KEYS.me })
    },
  })
}

/** Follow state of one item (`itemID@registry`), for the follow button. */
export const useFollow = (
  itemId: string | undefined,
  account: string | undefined,
) => {
  const queryClient = useQueryClient()
  const follows = useQuery({
    queryKey: accountKey(account ?? '', 'follows'),
    queryFn: () =>
      accountApi<{
        follows: { itemId: string; label: string; url: string | null }[]
      }>(queryClient, account, '/me/follows'),
    enabled: Boolean(account),
    staleTime: 60_000,
    retry: false,
  })
  const following = Boolean(
    itemId &&
    follows.data?.follows.some((f) => f.itemId === itemId.toLowerCase()),
  )
  const toggle = useMutation({
    // Signing in and following can be one click: the account is read when it runs.
    mutationFn: async () => {
      const current = signedInAccount(queryClient)
      await accountApi(
        queryClient,
        current,
        `/me/follows/${encodeURIComponent((itemId ?? '').toLowerCase())}`,
        { method: following ? 'DELETE' : 'PUT', json: {} },
      )
      return current
    },
    onSuccess: (current) => {
      if (current)
        queryClient.invalidateQueries({
          queryKey: accountKey(current, 'follows'),
        })
    },
  })
  return { following, toggle, isLoading: follows.isLoading }
}

/** How far the signed-in account has read each item's evidence, on any device. */
export const useEvidenceReads = (account: string | undefined) => {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: accountKey(account ?? '', 'reads'),
    queryFn: () =>
      accountApi<{ reads: Record<string, number> }>(
        queryClient,
        account,
        '/me/reads',
      ),
    enabled: Boolean(account),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

/**
 * Keeps what the server answered to a save of `account`'s reads, unless
 * another account is signed in by the time it arrives.
 */
export const readsSaved = (
  queryClient: QueryClient,
  account: string,
  data: { reads: Record<string, number>; alertsRead: number },
) => {
  if (signedInAccount(queryClient) !== account.toLowerCase()) return
  queryClient.setQueryData(accountKey(account, 'reads'), { reads: data.reads })
  if (data.alertsRead > 0) {
    queryClient.invalidateQueries({ queryKey: accountKey(account, 'inbox') })
    queryClient.invalidateQueries({ queryKey: KEYS.me })
  }
}

// Network failures and server errors are worth retrying; refusals are not.
const retryTransient = (failures: number, error: unknown) =>
  failures < 3 &&
  !(
    error instanceof NotifyApiError &&
    error.status < 500 &&
    error.status !== 429
  )

/**
 * Saves `account`'s evidence reads (at most READS_PER_REQUEST per call); the
 * server also marks the alerts about evidence up to there as read.
 */
export const useSaveEvidenceReads = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      account,
      reads,
    }: {
      account: string
      reads: Record<string, number>
    }) =>
      accountApi<{ reads: Record<string, number>; alertsRead: number }>(
        queryClient,
        account,
        '/me/reads',
        { method: 'POST', json: { reads } },
      ),
    retry: retryTransient,
    onSuccess: (data, { account }) => readsSaved(queryClient, account, data),
  })
}

// ---------------------------------------------------------------------------
// Browser push
// ---------------------------------------------------------------------------

const SERVICE_WORKER = '/notify-sw.js'

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const subscribeToPush = async (publicKey: string, call: AccountCall) => {
  if (!isPushSupported())
    throw new Error('This browser does not support notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw new Error(
      'Notifications are blocked for this site in your browser settings.',
    )
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER)
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  await call('/me/push', { method: 'POST', json: subscription.toJSON() })
}

const unsubscribeFromPush = async (call: AccountCall) => {
  const registration = isPushSupported()
    ? await navigator.serviceWorker.getRegistration(SERVICE_WORKER)
    : undefined
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await call('/me/push', {
    method: 'DELETE',
    json: { endpoint: subscription.endpoint },
  })
  await subscription.unsubscribe()
}

/** Endpoint of this browser's push subscription, if any. */
export const currentPushEndpoint = async (): Promise<string | null> => {
  if (!isPushSupported()) return null
  const registration =
    await navigator.serviceWorker.getRegistration(SERVICE_WORKER)
  return (await registration?.pushManager.getSubscription())?.endpoint ?? null
}
