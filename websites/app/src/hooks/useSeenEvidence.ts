import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { isValidRead, readsAhead, uploadReads } from 'utils/cases/reads'
import {
  useEvidenceReads,
  useNotifyConfig,
  useNotifyProfile,
  useSaveEvidenceReads,
} from './useNotifications'

/**
 * Which evidence a wallet has read, per item: the time up to which it has
 * seen the item's Evidence tab. Kept in this browser, and on the server for
 * a wallet signed in to notifications, so it follows it across devices.
 */

const keyOf = (viewer: string) => `scout:evidence-seen:${viewer.toLowerCase()}`
const listeners = new Set<() => void>()

const readRaw = (viewer: string) => {
  try {
    return window.localStorage.getItem(keyOf(viewer)) ?? '{}'
  } catch {
    return '{}'
  }
}

const parse = (raw: string): Record<string, number> => {
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

/** Records in this browser that `viewer` has read the item's evidence up to `until`. */
export const markEvidenceSeen = (
  viewer: string,
  itemId: string,
  until: number,
) => {
  const seen = parse(readRaw(viewer))
  const id = itemId.toLowerCase()
  if ((seen[id] ?? 0) >= until) return
  seen[id] = until
  try {
    window.localStorage.setItem(keyOf(viewer), JSON.stringify(seen))
  } catch {
    // Private mode or full storage: counts just won't persist here.
  }
  listeners.forEach((listener) => listener())
}

/**
 * The account signed in to notifications when it is `viewer` (the server
 * then keeps its reads), and whether that is known yet.
 */
const useSyncedAccount = (viewer: string | undefined) => {
  const config = useNotifyConfig()
  const profile = useNotifyProfile()
  const known =
    (config.isError || config.isSuccess) &&
    (!config.isSuccess || profile.isError || profile.isSuccess)
  const account =
    viewer &&
    profile.data?.signedIn &&
    profile.data.address === viewer.toLowerCase()
      ? profile.data.address
      : undefined
  return { account, known }
}

// Reads made in this browser before signing in are uploaded once per
// account and page session. A failed upload ends the run; the next time
// evidence is shown, a new run sends what the server still lacks.
const syncing = new Set<string>()

/**
 * Per item id (lowercase), the time up to which `viewer` has read its
 * evidence, and whether the server's copy (if any) is merged in yet.
 */
export const useSeenEvidenceState = (viewer: string | undefined) => {
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener)
      // Other tabs of the app.
      const onStorage = (event: StorageEvent) => {
        if (viewer && event.key === keyOf(viewer)) listener()
      }
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
    [viewer],
  )
  const raw = useSyncExternalStore(subscribe, () =>
    viewer ? readRaw(viewer) : '{}',
  )
  const { account, known } = useSyncedAccount(viewer)
  const server = useEvidenceReads(account)
  const remote = account ? server.data?.reads : undefined
  const ready = known && (!account || server.isSuccess || server.isError)
  const { mutateAsync: save } = useSaveEvidenceReads()

  useEffect(() => {
    if (!account || !remote || syncing.has(account)) return
    syncing.add(account)
    const uploads = readsAhead(parse(readRaw(account)), remote)
    uploadReads(uploads, (reads) => save({ account, reads })).catch(() =>
      syncing.delete(account),
    )
  }, [account, remote, save])

  const seen = useMemo(() => {
    const merged = parse(raw)
    for (const [id, until] of Object.entries(remote ?? {}))
      merged[id] = Math.max(merged[id] ?? 0, until)
    return merged
  }, [raw, remote])
  return { seen, ready }
}

/** Per item id (lowercase), the time up to which `viewer` has read its evidence. */
export const useSeenEvidence = (viewer: string | undefined) =>
  useSeenEvidenceState(viewer).seen

/** Marks an item's evidence read here and, when signed in, on every device. */
export const useMarkEvidenceSeen = (viewer: string | undefined) => {
  const { account } = useSyncedAccount(viewer)
  const remote = useEvidenceReads(account).data?.reads
  const { mutate: save } = useSaveEvidenceReads()
  return useCallback(
    (itemId: string, until: number) => {
      if (!viewer) return
      markEvidenceSeen(viewer, itemId, until)
      const id = itemId.toLowerCase()
      // Saving also reads the alerts about evidence up to there, on every device.
      if (account && isValidRead(id, until) && until > (remote?.[id] ?? 0))
        save({ account, reads: { [id]: until } })
    },
    [viewer, account, remote, save],
  )
}
