/**
 * Evidence reads: per item, the time up to which a wallet has read the
 * item's evidence. Shared by the app, which uploads them, and the
 * notification API, which validates them.
 */

/** An item id as the indexer writes it: `itemID@registry`, lowercase. */
export const ITEM_ID = /^0x[0-9a-f]{64}@0x[0-9a-f]{40}$/

/**
 * Reads per upload. An entry is at most about 125 bytes of JSON, so a full
 * upload stays well under the API's 16 KiB body limit.
 */
export const READS_PER_REQUEST = 100

/** Whether the API accepts a read: a known item id and a past time (an hour of clock skew allowed). */
export const isValidRead = (
  itemId: string,
  until: unknown,
  now = Math.floor(Date.now() / 1000),
): until is number =>
  ITEM_ID.test(itemId) &&
  Number.isSafeInteger(until) &&
  (until as number) > 0 &&
  (until as number) <= now + 3600

/**
 * The reads kept in this browser that the server lacks (or has older), in
 * uploads of at most READS_PER_REQUEST.
 */
export const readsAhead = (
  local: Record<string, unknown>,
  remote: Record<string, number>,
  now?: number,
): Record<string, number>[] => {
  const ahead = Object.entries(local).filter(
    (entry): entry is [string, number] =>
      isValidRead(entry[0], entry[1], now) &&
      entry[1] > (remote[entry[0]] ?? 0),
  )
  const uploads: Record<string, number>[] = []
  for (let i = 0; i < ahead.length; i += READS_PER_REQUEST)
    uploads.push(Object.fromEntries(ahead.slice(i, i + READS_PER_REQUEST)))
  return uploads
}

/**
 * Uploads `uploads` in order and stops at the first that fails, so what went
 * through stays saved and the next run sends only the rest. Resolves only
 * once every upload is acknowledged.
 */
export const uploadReads = async (
  uploads: Record<string, number>[],
  save: (reads: Record<string, number>) => Promise<unknown>,
) => {
  for (const reads of uploads) await save(reads)
}
