import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Which evidence a wallet has read, per item: the time up to which it has
 * seen the item's Evidence tab. Kept in this browser; every view that shows
 * "new" counts updates as soon as the tab is opened anywhere.
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

// Read marks are dropped once this old: by then their requests are long
// resolved, and only open requests count unread evidence.
const KEEP_SECONDS = 180 * 24 * 60 * 60

/**
 * The read marks worth keeping at `now` (unix seconds): those for evidence
 * from the last 180 days, and `keep`, the one being written. A request still
 * open 180 days after its latest evidence (rare: appeal rounds take weeks)
 * may show that evidence as new again.
 */
export const pruneSeen = (
  seen: Record<string, number>,
  now: number,
  keep?: string,
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(seen).filter(
      ([id, until]) =>
        id === keep ||
        (typeof until === 'number' && until >= now - KEEP_SECONDS),
    ),
  )

/** Records in this browser that `viewer` has read the item's evidence up to `until`. */
export const markEvidenceSeen = (
  viewer: string,
  itemId: string,
  until: number,
) => {
  const seen = parse(readRaw(viewer))
  const id = itemId.toLowerCase()
  if ((seen[id] ?? 0) >= until) return
  const next = pruneSeen(
    { ...seen, [id]: until },
    Math.floor(Date.now() / 1000),
    id,
  )
  try {
    window.localStorage.setItem(keyOf(viewer), JSON.stringify(next))
  } catch {
    // Private mode or full storage: counts just won't persist here.
  }
  listeners.forEach((listener) => listener())
}

/**
 * Per item id (lowercase), the time up to which `viewer` has read its
 * evidence, and whether every source of reads has loaded (with this
 * browser as the only source, right away).
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
  const seen = useMemo(() => parse(raw), [raw])
  return { seen, ready: true }
}

/** Per item id (lowercase), the time up to which `viewer` has read its evidence. */
export const useSeenEvidence = (viewer: string | undefined) =>
  useSeenEvidenceState(viewer).seen

/** Marks an item's evidence read. */
export const useMarkEvidenceSeen = (viewer: string | undefined) =>
  useCallback(
    (itemId: string, until: number) => {
      if (viewer) markEvidenceSeen(viewer, itemId, until)
    },
    [viewer],
  )
