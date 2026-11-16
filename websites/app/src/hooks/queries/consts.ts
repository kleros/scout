/*
 * Every read below goes to an indexer whose limit (250 requests a minute) is shared by every visitor
 * of Scout and Curate, so pages ask again only as often as what they show can change. A tab that is
 * hidden asks nothing (react-query pauses intervals), and the user's own confirmed transaction
 * triggers a burst of reads (components/RefreshAfterTransactions).
 */
export const REFETCH_INTERVAL = 5000; // 5 seconds
export const STALE_TIME = 10000; // 10 seconds

/** Registry counts, metadata and deposits: they change with new entries or governance, not by the second. */
export const COUNTS_REFETCH_INTERVAL = 60_000;
export const COUNTS_STALE_TIME = 30_000;

/** An item page, by what can happen to the item next. */
export const ITEM_REFETCH = {
  /** A request inside its challenge period: someone may challenge it. */
  challengePeriod: 30_000,
  /** A dispute in its appeal period: both sides may be funding. */
  appealPeriod: 20_000,
  /** A dispute waiting for the jurors (evidence, commit, vote): changes come slowly. */
  awaitingRuling: 60_000,
  /** An item opened right after it was submitted and not indexed yet. */
  notIndexedYet: 5_000,
} as const;

// Query keys
export const queryKeys = {
  items: (searchParams: URLSearchParams) => ['items', Object.fromEntries(searchParams)],
  itemDetails: (itemId: string) => ['itemDetails', itemId],
  itemCounts: () => ['itemCounts'],
} as const;
