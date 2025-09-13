import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { useGraphqlBatcher } from './queries/useGraphqlBatcher';
import { registryMap } from '../utils/fetchItems';
import { DAPPLOOKER_API_KEY } from 'consts';

type ChainName = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

interface RegistryData {
  id: string;
  numberOfRegistered: string;
  numberOfAbsent: string;
  numberOfRegistrationRequested: string;
  numberOfClearingRequested: string;
  numberOfChallengedRegistrations: string;
  numberOfChallengedClearing: string;
}

interface ItemData {
  id: string;
  status: string;
  disputed: boolean;
  latestRequestSubmissionTime: string;
  registryAddress: string;
  metadata?: {
    key0?: string;
    key1?: string;
    key2?: string;
    key3?: string;
    key4?: string;
  };
  requests: Array<{
    submissionTime: string;
    requester: string;
    challenger?: string;
    disputed: boolean;
    deposit: string;
  }>;
}

interface SubgraphResponse {
  lregistries: RegistryData[];
  litems: ItemData[];
}

interface DapplookerStatsData {
  totalAssetsVerified: number;
  totalSubmissions: number;
  totalCurators: number;
  tokens: {
    assetsVerified: number;
    assetsVerifiedChange: number;
  };
  cdn: {
    assetsVerified: number;
    assetsVerifiedChange: number;
  };
  singleTags: {
    assetsVerified: number;
    assetsVerifiedChange: number;
  };
  tagQueries: {
    assetsVerified: number;
    assetsVerifiedChange: number;
  };
  submissionsVsDisputes: {
    submissions: number[];
    disputes: number[];
    dates: string[];
  };
  chainRanking: {
    rank: number;
    chain: string;
    items: number;
  }[];
}

const DASHBOARD_ID = 'f5dcef21-ad65-4671-a930-58d3ec67f6a2';

const CHAIN_PREFIXES: Record<string, ChainName> = {
  'eip155:1:': 'ethereum',
  'eip155:137:': 'polygon',
  'eip155:42161:': 'arbitrum',
  'eip155:10:': 'optimism',
  'eip155:8453:': 'base',
};

const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: false,
  retry: 2,
} as const;

const EMPTY_STATS: DapplookerStatsData = {
  totalAssetsVerified: 0,
  totalSubmissions: 0,
  totalCurators: 0,
  tokens: { assetsVerified: 0, assetsVerifiedChange: 0 },
  cdn: { assetsVerified: 0, assetsVerifiedChange: 0 },
  singleTags: { assetsVerified: 0, assetsVerifiedChange: 0 },
  tagQueries: { assetsVerified: 0, assetsVerifiedChange: 0 },
  submissionsVsDisputes: { submissions: [], disputes: [], dates: [] },
  chainRanking: []
};

const getCurateStatsQuery = () => {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  
  return gql`
    query CurateStats {
      lregistries(
        where: { id_in: [
          "0x66260c69d03837016d88c9877e61e08ef74c59f2",
          "0xae6aaed5434244be3699c56e7ebc828194f26dc3",
          "0x957a53a994860be4750810131d9c876b2f52d6e1",
          "0xee1502e29795ef6c2d60f8d7120596abe3bad990"
        ]}
      ) {
        id
        numberOfRegistered
        numberOfAbsent
        numberOfRegistrationRequested
        numberOfClearingRequested
        numberOfChallengedRegistrations
        numberOfChallengedClearing
      }
      litems(
        first: 1000, 
        orderBy: latestRequestSubmissionTime, 
        orderDirection: desc,
        where: { latestRequestSubmissionTime_gt: "${thirtyDaysAgo}" }
      ) {
      id
      status
      disputed
      latestRequestSubmissionTime
      registryAddress
      requests(first: 1, orderBy: submissionTime, orderDirection: desc) {
        submissionTime
        requester
        challenger
        disputed
        deposit
      }
      metadata {
        key0
        key1
        key2
        key3
        key4
      }
    }
  }
  `;
};

// Query to get curator statistics
const CURATOR_STATS_QUERY = gql`
  query CuratorStats {
    litems(first: 1000) {
      requests {
        requester
        challenger
      }
    }
  }
`;


const getCardType = (cardName: string): string => {
  if (cardName.includes('curators')) return 'curators';
  if (cardName.includes('total submissions')) return 'totalSubmissions';
  if (cardName.includes('chain ranking')) return 'chainRanking';
  if (cardName.includes('tokens v2')) return 'tokens';
  if (cardName.includes('cdn v2')) return 'cdn';
  if (cardName.includes('address tags v2')) return 'singleTags';
  if (cardName.includes('3x security registries')) return 'tagQueries';
  return 'unknown';
};

const fetchDapplookerData = async (graphqlBatcher: any): Promise<DapplookerStatsData | null> => {
  if (!DAPPLOOKER_API_KEY) {
    return null;
  }

  try {
    const apiUrl = `/api/dapplooker/public/api/public/dashboard/${DASHBOARD_ID}`;
    
    let dashboardResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!dashboardResponse.ok) {
      const fallbackUrl = `/api/dapplooker/public/api/public/dashboard/${DASHBOARD_ID}`;
      
      dashboardResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    }

    if (dashboardResponse.ok) {
      const responseText = await dashboardResponse.text();
      
      let dashboardInfo;
      try {
        dashboardInfo = JSON.parse(responseText);
      } catch (jsonError) {
        return null;
      }
      
      if (dashboardInfo.ordered_cards && Array.isArray(dashboardInfo.ordered_cards)) {
        const cardDataPromises = [];
        
        for (const cardWrapper of dashboardInfo.ordered_cards) {
          const card = cardWrapper.card;
          if (!card?.id || !card?.name) continue;
          
          const cardName = card.name.toLowerCase();
          const isRelevantCard = 
            card.display === 'scalar' ||
            cardName.includes('chain ranking') ||
            cardName.includes('tokens v2 - submission') ||
            cardName.includes('cdn v2 - submission') ||
            cardName.includes('address tags v2 - submission') ||
            cardName.includes('3x security registries - stacked by registry');
            
          if (isRelevantCard) {
            cardDataPromises.push(Promise.resolve({
              id: card.id,
              name: card.name,
              display: card.display,
              cardType: getCardType(cardName)
            }));
          }
        }
        
        if (cardDataPromises.length > 0) {
          const cardResults = await Promise.all(cardDataPromises);
          const validCardResults = cardResults.filter(Boolean);
          
          if (validCardResults.length > 0) {
            return await fetchKlerosSubgraphData(graphqlBatcher);
          }
        }
      }
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
};


const getChainFromKey = (key0: string): ChainName | null => {
  for (const [prefix, chain] of Object.entries(CHAIN_PREFIXES)) {
    if (key0.startsWith(prefix)) {
      return chain;
    }
  }
  return null;
};

const calculateRegistryStats = (registries: RegistryData[], registryId: string, fallbackItems?: ItemData[]) => {
  // Try direct match first
  let registry = registries.find((r) => r.id.toLowerCase() === registryId.toLowerCase());
  
  // If not found, try matching without '0x' prefix in case of format difference
  if (!registry && registryId.startsWith('0x')) {
    registry = registries.find((r) => r.id.toLowerCase() === registryId.slice(2).toLowerCase());
  }
  
  // If still not found, try adding '0x' prefix in case registry ID doesn't have it
  if (!registry && !registryId.startsWith('0x')) {
    registry = registries.find((r) => r.id.toLowerCase() === `0x${registryId}`.toLowerCase());
  }
  
  if (!registry) {
    // Fallback: Calculate from items if available
    if (fallbackItems) {
      const registryItems = fallbackItems.filter(item => 
        item.registryAddress?.toLowerCase() === registryId.toLowerCase()
      );
      
      const registered = registryItems.filter(item => item.status === 'Registered').length;
      const registrationRequested = registryItems.filter(item => item.status === 'RegistrationRequested').length;
      const clearingRequested = registryItems.filter(item => item.status === 'ClearingRequested').length;
      const totalSubmissions = registered + registrationRequested + clearingRequested;
      
      return {
        assetsVerified: registered,
        assetsVerifiedChange: totalSubmissions
      };
    }
    
    return { assetsVerified: 0, assetsVerifiedChange: 0 };
  }
  
  const registered = parseInt(registry.numberOfRegistered, 10) || 0;
  const registrationRequested = parseInt(registry.numberOfRegistrationRequested, 10) || 0;
  const clearingRequested = parseInt(registry.numberOfClearingRequested, 10) || 0;
  
  const totalSubmissions = registered + registrationRequested + clearingRequested;
  
  return {
    assetsVerified: registered,
    assetsVerifiedChange: totalSubmissions
  };
};

const generateDateRange = (days: number): Date[] => {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - i));
    return date;
  });
};

const filterItemsByDate = (items: ItemData[], targetDate: Date, includeDisputed = false): number => {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);
  
  return items.filter((item) => {
    const submissionTime = new Date(parseInt(item.latestRequestSubmissionTime, 10) * 1000);
    const isInDateRange = submissionTime >= dayStart && submissionTime <= dayEnd;
    return includeDisputed ? isInDateRange && item.disputed : isInDateRange;
  }).length;
};

const calculateChainRanking = (items: ItemData[]) => {
  const chainCounts = new Map<ChainName, number>();
  
  items.forEach((item) => {
    const key0 = item.metadata?.key0;
    if (!key0) return;
    
    const chain = getChainFromKey(key0);
    if (chain) {
      chainCounts.set(chain, (chainCounts.get(chain) || 0) + 1);
    }
  });
  
  return Array.from(chainCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([chain, count], index) => ({
      rank: index + 1,
      chain,
      items: count
    }));
};

const fetchKlerosSubgraphData = async (graphqlBatcher: any): Promise<DapplookerStatsData> => {
  const statsRequestId = `stats-${Date.now()}-${Math.random()}`;
  const curatorRequestId = `curator-${Date.now()}-${Math.random()}`;
  
  const [statsResult, curatorResult] = await Promise.all([
    graphqlBatcher.request(statsRequestId, getCurateStatsQuery()) as Promise<SubgraphResponse>,
    graphqlBatcher.request(curatorRequestId, CURATOR_STATS_QUERY) as Promise<{ litems: ItemData[] }>
  ]);
    
  const registries = statsResult.lregistries || [];
  const items = statsResult.litems || [];
  const curatorItems = curatorResult.litems || [];
  
  // Calculate totals
  const totalVerified = registries.reduce((total, reg) => {
    return total + (parseInt(reg.numberOfRegistered, 10) || 0);
  }, 0);
  
  const totalSubmissions = registries.reduce((total, reg) => {
    return total + 
      (parseInt(reg.numberOfRegistered, 10) || 0) + 
      (parseInt(reg.numberOfRegistrationRequested, 10) || 0) + 
      (parseInt(reg.numberOfClearingRequested, 10) || 0);
  }, 0);
  
  // Calculate unique curators
  const uniqueCurators = new Set<string>();
  curatorItems.forEach((item) => {
    item.requests?.forEach((req) => {
      if (req.requester) uniqueCurators.add(req.requester.toLowerCase());
      if (req.challenger) uniqueCurators.add(req.challenger.toLowerCase());
    });
  });
  
  // Generate time series data
  const last7Days = generateDateRange(30);
  const submissionsData = last7Days.map(date => filterItemsByDate(items, date));
  const disputesData = last7Days.map(date => filterItemsByDate(items, date, true));
  const chainRanking = calculateChainRanking(items);

  const tokensStats = calculateRegistryStats(registries, registryMap.Tokens, items);
  const cdnStats = calculateRegistryStats(registries, registryMap.CDN, items);
  const singleTagsStats = calculateRegistryStats(registries, registryMap.Single_Tags, items);
  const tagQueriesStats = calculateRegistryStats(registries, registryMap.Tags_Queries, items);

  return {
    totalAssetsVerified: totalVerified,
    totalSubmissions: totalSubmissions,
    totalCurators: uniqueCurators.size,
    tokens: tokensStats,
    cdn: cdnStats, 
    singleTags: singleTagsStats,
    tagQueries: tagQueriesStats,
    submissionsVsDisputes: {
      submissions: submissionsData,
      disputes: disputesData,
      dates: last7Days.map(d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }))
    },
    chainRanking
  };
};

export const useDapplookerStats = () => {
  const graphqlBatcher = useGraphqlBatcher();
  
  return useQuery({
    queryKey: ['dapplooker-stats'],
    queryFn: async (): Promise<DapplookerStatsData> => {
      try {
        if (DAPPLOOKER_API_KEY) {
          const enhancedData = await fetchDapplookerData(graphqlBatcher);
          if (enhancedData) {
            return enhancedData;
          }
        }
        
        return await fetchKlerosSubgraphData(graphqlBatcher);
      } catch (error) {
        return EMPTY_STATS;
      }
    },
    ...CACHE_CONFIG,
  });
};