import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT, TRACKED_DISPUTE_COURT_IDS } from 'consts';

interface KlerosDispute {
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

const KLEROS_DISPUTES_QUERY = gql`
  query LatestDisputes($first: Int!, $orderBy: String!, $orderDirection: String!, $court: String!) {
    disputes(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: { court: $court }) {
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

const fetchCourtDisputes = async (
  court: string,
  first: number,
): Promise<KlerosDispute[]> => {
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
        court,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result: { data?: KlerosDisputesResponse } = await response.json();
  return result.data?.disputes ?? [];
};

// Fetch each tracked court independently so every court is represented, then
// merge the results and sort by dispute number descending. A single court_in
// query would be limited to `first` rows total and could miss the latest
// disputes from courts with lower IDs, so we fetch `first` per court and trim
// after sorting.
const fetchKlerosDisputes = async (first = 10): Promise<KlerosDispute[]> => {
  const perCourtDisputes = await Promise.all(
    TRACKED_DISPUTE_COURT_IDS.map((court) => fetchCourtDisputes(court, first)),
  );

  return perCourtDisputes
    .flat()
    .sort((a, b) => Number(b.disputeIDNumber) - Number(a.disputeIDNumber))
    .slice(0, first);
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

export const formatDisputeDeadline = (lastPeriodChangeTs: string): string => {
  const lastChange = new Date(parseInt(lastPeriodChangeTs) * 1000);
  const now = new Date();
  
  // Check if the timestamp is in the future (possibly incorrect data)
  if (lastChange.getTime() > now.getTime()) {
    return 'Recently updated';
  }
  
  const diffMs = now.getTime() - lastChange.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} days, ${diffHours}h ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${Math.max(1, diffMinutes)}m ago`;
  }
};