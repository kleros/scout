import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';

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

const KLEROS_GNOSIS_ENDPOINT = '/api/thegraph/query/61738/kleros-display-gnosis/version/latest';

// xDAI Curation Court ID
const XDAI_CURATION_COURT_ID = '1';

const CACHE_CONFIG = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  retry: 2,
} as const;

const fetchKlerosDisputes = async (first = 10): Promise<KlerosDispute[]> => {
  try {
    console.log('🚀 Fetching Kleros disputes from xDAI Curation Court...');
    
    const response = await fetch(KLEROS_GNOSIS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: KLEROS_DISPUTES_QUERY,
        variables: {
          first,
          orderBy: 'lastPeriodChangeTs',
          orderDirection: 'desc',
          court: XDAI_CURATION_COURT_ID,
        },
      }),
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result: { data: KlerosDisputesResponse } = await response.json();
    console.log('📋 Full response:', result);
    
    if (!result.data?.disputes) {
      console.warn('⚠️ No disputes data in response:', result);
      return [];
    }

    console.log('✅ Found', result.data.disputes.length, 'disputes from xDAI Curation Court');
    console.log('📊 Disputes data:', result.data.disputes);
    
    return result.data.disputes;
  } catch (error) {
    console.error('❌ Error fetching Kleros disputes:', error);
    throw error;
  }
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

export const getCourtName = (courtID: string): string => {
  const courts: Record<string, string> = {
    '0': 'General Court',
    '1': 'Curation Court', // xDAI Curation Court
    '2': 'Technical Court',
    '3': 'Marketing Services Court',
    '4': 'English Language Court',
    '5': 'Video Production Court',
    '6': 'Onboarding Court',
    '7': 'Translation Court',
    '8': 'Data Analysis Court',
  };
  return courts[courtID] || 'General Court';
};