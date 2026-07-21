import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { CURATE_REWARDS_SNAPSHOTS_URL } from "consts/index";

interface SnapshotEntry {
  registry?: string;
  chainName?: string;
  tagAddress?: string;
  amount?: string;
}

interface SnapshotRecipient {
  total: string;
  submissions?: SnapshotEntry[];
  removals?: SnapshotEntry[];
  atq?: SnapshotEntry[];
}

interface RewardsSnapshot {
  period?: { label?: string };
  token?: { symbol?: string };
  recipients?: Record<string, SnapshotRecipient>;
}

// One itemized rewarded entry (only entries carrying a tagAddress are kept,
// so they can be matched back to a specific registry item)
export interface RewardedEntry {
  registry: string;
  chainName: string;
  tagAddress: string;
  amountWei: string;
}

interface RecipientAggregate {
  periods: { period: string; amountWei: string }[];
  entries: RewardedEntry[];
}

interface AggregatedRewards {
  tokenSymbol: string;
  // keyed by lowercase recipient address
  recipients: Record<string, RecipientAggregate>;
}

export interface CurateRewardsSummary {
  totalWei: bigint;
  tokenSymbol: string;
  rewardedMonths: number;
  rewardedEntries: RewardedEntry[];
}

const ENTRY_KINDS = ["submissions", "removals", "atq"] as const;

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

const fetchAggregatedRewards = async (): Promise<AggregatedRewards> => {
  const snapshotUrls: string[] = await fetchJson(CURATE_REWARDS_SNAPSHOTS_URL);
  const results = await Promise.allSettled(
    snapshotUrls.map((url) => fetchJson(url) as Promise<RewardsSnapshot>)
  );

  // Fail loudly rather than silently undercounting: react-query retries, and
  // the UI shows an unknown state instead of a wrong total
  const failedCount = results.filter((r) => r.status === "rejected").length;
  if (failedCount > 0) {
    throw new Error(`${failedCount} of ${results.length} reward snapshots failed to load`);
  }

  // Null prototype so lookups can't hit Object.prototype via ?address=constructor
  const recipients: AggregatedRewards["recipients"] = Object.create(null);
  let tokenSymbol = "PNK";
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const snapshot = result.value;
    if (snapshot?.token?.symbol) tokenSymbol = snapshot.token.symbol;
    const period = snapshot?.period?.label ?? "";
    for (const [address, recipient] of Object.entries(snapshot?.recipients ?? {})) {
      if (!recipient?.total) continue;
      const aggregate = (recipients[address.toLowerCase()] ??= { periods: [], entries: [] });
      aggregate.periods.push({ period, amountWei: recipient.total });
      for (const kind of ENTRY_KINDS) {
        for (const entry of recipient[kind] ?? []) {
          if (!entry?.tagAddress || !entry.amount) continue;
          aggregate.entries.push({
            registry: entry.registry ?? "",
            chainName: entry.chainName ?? "",
            tagAddress: entry.tagAddress,
            amountWei: entry.amount,
          });
        }
      }
    }
  }
  return { tokenSymbol, recipients };
};

export const useCurateRewards = (address?: string) => {
  const userAddress = address?.toLowerCase();

  const select = useCallback(
    (data: AggregatedRewards): CurateRewardsSummary => {
      const aggregate = (userAddress && data.recipients[userAddress]) || undefined;
      let totalWei = 0n;
      for (const { amountWei } of aggregate?.periods ?? []) {
        try {
          totalWei += BigInt(amountWei);
        } catch {
          // skip malformed amounts
        }
      }
      return {
        totalWei,
        tokenSymbol: data.tokenSymbol,
        rewardedMonths: aggregate?.periods.length ?? 0,
        rewardedEntries: aggregate?.entries ?? [],
      };
    },
    [userAddress]
  );

  return useQuery({
    // No address in the key: the aggregated snapshot data is shared across profiles
    queryKey: ["useCurateRewards"],
    enabled: !!userAddress,
    // Snapshots are immutable IPFS files; the index only gains one link per month
    staleTime: 60 * 60 * 1000,
    retry: 2,
    queryFn: fetchAggregatedRewards,
    select,
  });
};
