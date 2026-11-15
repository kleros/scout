import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT } from 'consts';
import { registryMap } from 'utils/items';

export interface KlerosDispute {
  id: string;
  disputeIDNumber: string;
  court: {
    id: string;
  };
  period: string;
  lastPeriodChangeTs: string;
  ruled: boolean;
  ruling: string;
  arbitrated: string;
}

interface KlerosDisputesResponse {
  disputes: KlerosDispute[];
}

// Scout's disputes are the ones raised by its four registries (the arbitrable contracts), whatever
// court they were created in or appealed to.
const SCOUT_REGISTRY_ADDRESSES = Object.values(registryMap);

const KLEROS_DISPUTES_QUERY = gql`
  query LatestDisputes($first: Int!, $orderBy: String!, $orderDirection: String!, $arbitrated: [String!]!) {
    disputes(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: { arbitrated_in: $arbitrated }) {
      id
      disputeIDNumber
      court {
        id
      }
      period
      lastPeriodChangeTs
      ruled
      ruling
      arbitrated
    }
  }
`;

const CACHE_CONFIG = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  retry: 2,
} as const;

const fetchKlerosDisputes = async (first = 10): Promise<KlerosDispute[]> => {
  const response = await fetch(SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: KLEROS_DISPUTES_QUERY,
      variables: {
        first,
        orderBy: 'disputeIDNumber',
        orderDirection: 'desc',
        arbitrated: SCOUT_REGISTRY_ADDRESSES,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result: { data?: KlerosDisputesResponse; errors?: Array<{ message: string }> } = await response.json();
  // A GraphQL error is a failed read, not "no disputes".
  if (!result.data) throw new Error(result.errors?.[0]?.message ?? 'The disputes did not load.');
  return result.data.disputes;
};

export const useKlerosDisputes = (first = 10) => {
  return useQuery({
    queryKey: ['kleros-disputes', first],
    queryFn: () => fetchKlerosDisputes(first),
    ...CACHE_CONFIG,
  });
};

// Helper functions for dispute data
export const getDisputePeriodName = (period: string): string => {
  const periods: Record<string, string> = {
    'EVIDENCE': 'Evidence',
    'COMMIT': 'Commit',
    'VOTE': 'Vote',
    'APPEAL': 'Appeal',
    'EXECUTED': 'Executed',
  };
  return periods[period] || period;
};

/** "3 days 8h", "1 day 9h", "5h", "12m": the time elapsed since `unixSeconds`. */
export const formatElapsed = (unixSeconds: string | number): string | null => {
  const diffMs = Date.now() - Number(unixSeconds) * 1000;
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    const days = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    return diffHours > 0 ? `${days} ${diffHours}h` : days;
  }
  if (diffHours > 0) return `${diffHours}h`;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${Math.max(1, diffMinutes)}m`;
};

export const formatDisputeDeadline = (lastPeriodChangeTs: string): string => {
  const elapsed = formatElapsed(lastPeriodChangeTs);
  // A timestamp in the future is most likely indexer clock skew.
  return elapsed ? `${elapsed} ago` : 'Recently updated';
};

const PERIOD_LEADS: Record<string, string> = {
  EVIDENCE: 'Evidence period started',
  COMMIT: 'Commit period started',
  VOTE: 'Voting period started',
  APPEAL: 'Appeal period started',
  EXECUTED: 'Executed',
};

/**
 * The words before the elapsed time on a dispute card: "Voting period started" (3 days 8h ago).
 * `lastPeriodChangeTs` is when the current period began, not a deadline.
 */
export const getDisputePeriodLead = (period: string): string =>
  PERIOD_LEADS[period] ?? `${getDisputePeriodName(period)} period started`;
