import { registryKeyOf, type IndexedItem } from './indexer'

export * from '../../src/utils/cases/labels'

/** Scout page of the item. */
export const itemUrl = (
  siteUrl: string,
  item: Pick<IndexedItem, 'itemID' | 'registryAddress'>,
) =>
  `${siteUrl}/${registryKeyOf(item.registryAddress) ?? item.registryAddress}/${item.itemID}`

/** "Sep 27, 14:05 UTC (in 26 h)" */
export const formatDeadline = (
  unixSeconds: number,
  now = Date.now() / 1000,
) => {
  const date = new Date(unixSeconds * 1000)
  const absolute = `${date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${date
    .toISOString()
    .slice(11, 16)} UTC`
  const hours = (unixSeconds - now) / 3600
  if (hours <= 0) return absolute
  // Rounded down: never promise more time than is left.
  const relative =
    hours < 1
      ? `${Math.max(1, Math.floor(hours * 60))} min`
      : hours < 48
        ? `${Math.floor(hours)} h`
        : `${Math.floor(hours / 24)} days`
  return `${absolute} (in ${relative})`
}
