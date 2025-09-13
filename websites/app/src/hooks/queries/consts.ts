export const REFETCH_INTERVAL = 5000; // 5 seconds
export const STALE_TIME = 10000; // 10 seconds

// Query keys
export const queryKeys = {
  items: (searchParams: URLSearchParams) => ['items', Object.fromEntries(searchParams)],
  itemDetails: (itemId: string) => ['itemDetails', itemId],
  itemCounts: () => ['itemCounts'],
} as const;