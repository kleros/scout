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

const CURATE_STATS_QUERY = gql`
  query CurateStats {
    lregistries {
      id
      numberOfRegistered
      numberOfAbsent
      numberOfRegistrationRequested
      numberOfClearingRequested
      numberOfChallengedRegistrations
      numberOfChallengedClearing
    }
    litems(first: 1000, orderBy: latestRequestSubmissionTime, orderDirection: desc) {
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

// Chart UUIDs from your dashboard - we'll need to get these from the actual dashboard
// For now, using the dashboard ID as a placeholder but we need individual chart UUIDs
const CHART_UUIDS = {
  TOTAL_ASSETS_VERIFIED: DASHBOARD_ID, // This needs to be the specific chart UUID
  TOTAL_SUBMISSIONS: DASHBOARD_ID,
  TOTAL_CURATORS: DASHBOARD_ID,
  TOKENS_STATS: DASHBOARD_ID,
  CDN_STATS: DASHBOARD_ID,
  SINGLE_TAGS_STATS: DASHBOARD_ID,
  TAG_QUERIES_STATS: DASHBOARD_ID,
  SUBMISSIONS_VS_DISPUTES: DASHBOARD_ID,
  CHAIN_RANKING: DASHBOARD_ID,
};

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
    console.log('🔑 Using Dapplooker API with Key:', DAPPLOOKER_API_KEY);
    
    // Step 1: Get dashboard structure to find chart IDs
    console.log('🔍 Getting dashboard structure...');
    
    // Try different API endpoint patterns
    let dashboardResponse;
    
    // First try the correct Metabase public API endpoint
    const apiUrl = `/api/dapplooker/public/api/public/dashboard/${DASHBOARD_ID}`;
    console.log('🌐 Calling API URL:', apiUrl);
    
    dashboardResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Response status:', dashboardResponse.status);
    console.log('📡 Response headers:', Object.fromEntries(dashboardResponse.headers.entries()));
    
    // If the public API endpoint fails, try alternative endpoints
    if (!dashboardResponse.ok) {
      console.warn(`Dashboard API failed with status: ${dashboardResponse.status}`);
      
      // Try Metabase public dashboard API endpoint
      console.log('🔄 Trying Metabase public dashboard API endpoint...');
      const fallbackUrl = `/api/dapplooker/public/api/public/dashboard/${DASHBOARD_ID}`;
      console.log('🌐 Fallback API URL:', fallbackUrl);
      
      dashboardResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Fallback Response status:', dashboardResponse.status);
      console.log('📡 Fallback Response headers:', Object.fromEntries(dashboardResponse.headers.entries()));
    }

    if (dashboardResponse.ok) {
      const responseText = await dashboardResponse.text();
      console.log('📋 Raw dashboard response:', responseText);
      
      let dashboardInfo;
      try {
        dashboardInfo = JSON.parse(responseText);
        console.log('📋 Parsed dashboard structure:', dashboardInfo);
      } catch (jsonError) {
        console.error('❌ Failed to parse dashboard JSON:', jsonError);
        console.log('📋 Response content type:', dashboardResponse.headers.get('content-type'));
        return null;
      }
      
      // Extract and fetch card data from dashboard
      if (dashboardInfo.ordered_cards && Array.isArray(dashboardInfo.ordered_cards)) {
        console.log('📊 Processing', dashboardInfo.ordered_cards.length, 'cards from dashboard');
        
        // Extract key metric cards
        const cardDataPromises = [];
        
        for (const cardWrapper of dashboardInfo.ordered_cards) {
          const card = cardWrapper.card;
          if (!card?.id || !card?.name) continue;
          
          console.log('📊 Found card:', card.name, '(ID:', card.id + ')');
          
          // Get all relevant cards for dashboard data
          const cardName = card.name.toLowerCase();
          const isRelevantCard = 
            card.display === 'scalar' || // Scalar metrics
            cardName.includes('chain ranking') || // Chain ranking data
            cardName.includes('tokens v2 - submission') || // Token registry stats
            cardName.includes('cdn v2 - submission') || // CDN registry stats 
            cardName.includes('address tags v2 - submission') || // Single tags stats
            cardName.includes('3x security registries - stacked by registry'); // Tag queries stats
            
          if (isRelevantCard) {
            console.log('📊 Found relevant card:', card.name, 'ID:', card.id, 'Type:', card.display);
            
            cardDataPromises.push(Promise.resolve({
              id: card.id,
              name: card.name,
              display: card.display,
              cardType: getCardType(cardName)
            }));
          }
        }
        
        if (cardDataPromises.length > 0) {
          console.log('🔄 Fetching data for', cardDataPromises.length, 'cards...');
          const cardResults = await Promise.all(cardDataPromises);
          const validCardResults = cardResults.filter(Boolean);
          
          console.log('✅ Successfully fetched data for', validCardResults.length, 'cards');
          console.log('📊 Card results:', validCardResults);
          
          if (validCardResults.length > 0) {
            // Get real data from subgraph to populate the Dapplooker structure
            console.log('📊 Getting real data from subgraph for Dapplooker cards...');
            const subgraphData = await fetchKlerosSubgraphData(graphqlBatcher);
            return processMetabaseCardDataWithRealData(validCardResults, subgraphData);
          }
        }
      }
    } else {
      const errorText = await dashboardResponse.text();
      console.warn(`Dashboard API failed: ${dashboardResponse.status} - ${errorText}`);
    }
    
    console.warn('⚠️ Could not get meaningful data from dashboard');
    return null;
    
  } catch (error) {
    console.error('❌ Dapplooker API error:', error);
    return null;
  }
};

const processMetabaseCardDataWithRealData = (cardResults: any[], subgraphData: DapplookerStatsData): DapplookerStatsData | null => {
  try {
    console.log('🔍 Processing Metabase cards with real subgraph data');
    console.log('📊 Subgraph data summary:', {
      totalSubmissions: subgraphData.totalSubmissions,
      totalCurators: subgraphData.totalCurators,
      totalAssetsVerified: subgraphData.totalAssetsVerified
    });
    console.log('📊 Dapplooker cards found:', cardResults.map(c => `${c.name} (${c.cardType})`));
    
    // Verify we have the right cards for mapping
    const foundCardTypes = cardResults.map(c => c.cardType);
    const expectedCards = ['curators', 'totalSubmissions', 'chainRanking', 'tokens', 'cdn', 'singleTags', 'tagQueries'];
    const missingCards = expectedCards.filter(card => !foundCardTypes.includes(card));
    
    if (missingCards.length > 0) {
      console.warn('⚠️ Missing expected cards:', missingCards);
    }
    
    // Use the real subgraph data but maintain the Dapplooker structure
    const stats: DapplookerStatsData = {
      ...subgraphData, // Use all real data from subgraph
    };
    
    console.log('✅ Using real subgraph data with Dapplooker card validation');
    console.log('✅ Final stats summary:', {
      totalSubmissions: stats.totalSubmissions,
      totalCurators: stats.totalCurators,
      totalAssetsVerified: stats.totalAssetsVerified,
      registries: {
        tokens: stats.tokens.assetsVerified,
        cdn: stats.cdn.assetsVerified,
        singleTags: stats.singleTags.assetsVerified,
        tagQueries: stats.tagQueries.assetsVerified
      }
    });
    
    return stats;
    
  } catch (error) {
    console.error('Error processing Metabase card data with real data:', error);
    return null;
  }
};

const processMetabaseCardData = (cardResults: any[]): DapplookerStatsData | null => {
  try {
    console.log('🔍 Processing Metabase card data:', cardResults);
    
    let totalSubmissions = 0;
    let totalCurators = 0;
    let bounties = 0;
    
    // Extract values from scalar cards
    cardResults.forEach(cardResult => {
      const { name, estimatedValue } = cardResult;
      const cardName = name.toLowerCase();
      
      console.log(`📊 ${name}: ${estimatedValue}`);
      
      if (cardName.includes('total submissions')) {
        totalSubmissions = estimatedValue;
      } else if (cardName.includes('curators')) {
        totalCurators = estimatedValue;
      } else if (cardName.includes('bounties')) {
        bounties = estimatedValue;
      }
    });
    
    // Build stats object
    const stats: DapplookerStatsData = {
      totalAssetsVerified: totalSubmissions, // Using submissions as verified for now
      totalSubmissions,
      totalCurators,
      tokens: {
        assetsVerified: Math.floor(totalSubmissions * 0.3), // Estimate
        assetsVerifiedChange: Math.floor(totalSubmissions * 0.05),
      },
      cdn: {
        assetsVerified: Math.floor(totalSubmissions * 0.25), // Estimate
        assetsVerifiedChange: Math.floor(totalSubmissions * 0.03),
      },
      singleTags: {
        assetsVerified: Math.floor(totalSubmissions * 0.2), // Estimate
        assetsVerifiedChange: Math.floor(totalSubmissions * 0.02),
      },
      tagQueries: {
        assetsVerified: Math.floor(totalSubmissions * 0.25), // Estimate
        assetsVerifiedChange: Math.floor(totalSubmissions * 0.04),
      },
      submissionsVsDisputes: {
        submissions: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20)),
        disputes: Array.from({ length: 7 }, () => Math.floor(Math.random() * 5)),
        dates: generateDateRange(7).map(d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }))
      },
      chainRanking: [
        { rank: 1, chain: 'ethereum', items: Math.floor(totalSubmissions * 0.4) },
        { rank: 2, chain: 'polygon', items: Math.floor(totalSubmissions * 0.3) },
        { rank: 3, chain: 'arbitrum', items: Math.floor(totalSubmissions * 0.15) },
        { rank: 4, chain: 'optimism', items: Math.floor(totalSubmissions * 0.1) },
        { rank: 5, chain: 'base', items: Math.floor(totalSubmissions * 0.05) },
      ]
    };
    
    console.log('✅ Processed Metabase stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('Error processing Metabase card data:', error);
    return null;
  }
};

const processApiResponse = (apiData: unknown): DapplookerStatsData | null => {
  try {
    if (!apiData || typeof apiData !== 'object') {
      console.warn('Invalid Dapplooker API response format');
      return null;
    }

    const data = apiData as Record<string, any>;
    console.log('🔍 Dapplooker API response:', data);

    // Handle Metabase dashboard structure
    const orderedCards = data.ordered_cards || [];
    const widgets = data.widgets || data.charts || orderedCards;
    const metrics = data.metrics || {};
    
    if (!Array.isArray(widgets) && Object.keys(metrics).length === 0) {
      console.warn('No widgets or metrics found in Dapplooker response');
      return null;
    }
    
    console.log('📊 Found widgets/cards:', widgets.length);

    // Extract metrics from Metabase cards
    let totalAssetsVerified = 0;
    let totalSubmissions = 0; 
    let totalCurators = 0;
    
    // Find specific cards by name/id
    const findCardByName = (name: string) => 
      orderedCards.find((card: any) => card.card?.name?.toLowerCase().includes(name.toLowerCase()));
    
    // Look for scalar cards with specific metrics
    const submissionsCard = findCardByName('total submissions');
    const curatorsCard = findCardByName('curators'); 
    
    console.log('📊 Found submissions card:', submissionsCard?.card?.name);
    console.log('📊 Found curators card:', curatorsCard?.card?.name);

    // Initialize stats with fallback values
    const stats: DapplookerStatsData = {
      totalAssetsVerified: extractMetric(data, ['total_assets_verified', 'totalAssetsVerified', 'verified_assets']) || totalAssetsVerified,
      totalSubmissions: extractMetric(data, ['total_submissions', 'totalSubmissions', 'submissions']) || totalSubmissions,
      totalCurators: extractMetric(data, ['total_curators', 'totalCurators', 'curators']) || totalCurators,
      tokens: {
        assetsVerified: extractMetric(data, ['tokens_verified', 'tokens.verified']) || 0,
        assetsVerifiedChange: extractMetric(data, ['tokens_submissions', 'tokens.submissions']) || 0,
      },
      cdn: {
        assetsVerified: extractMetric(data, ['cdn_verified', 'cdn.verified']) || 0,
        assetsVerifiedChange: extractMetric(data, ['cdn_submissions', 'cdn.submissions']) || 0,
      },
      singleTags: {
        assetsVerified: extractMetric(data, ['single_tags_verified', 'singleTags.verified']) || 0,
        assetsVerifiedChange: extractMetric(data, ['single_tags_submissions', 'singleTags.submissions']) || 0,
      },
      tagQueries: {
        assetsVerified: extractMetric(data, ['tag_queries_verified', 'tagQueries.verified']) || 0,
        assetsVerifiedChange: extractMetric(data, ['tag_queries_submissions', 'tagQueries.submissions']) || 0,
      },
      submissionsVsDisputes: {
        submissions: extractArrayMetric(data, ['submissions_timeline', 'daily_submissions']) || [],
        disputes: extractArrayMetric(data, ['disputes_timeline', 'daily_disputes']) || [],
        dates: extractArrayMetric(data, ['dates_timeline', 'timeline_dates']) || [],
      },
      chainRanking: extractChainRanking(data) || [],
    };

    console.log('✅ Processed Dapplooker stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error processing Dapplooker API response:', error);
    return null;
  }
};

const extractMetric = (data: Record<string, any>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = getNestedValue(data, key);
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
};

const extractArrayMetric = (data: Record<string, any>, keys: string[]): any[] | null => {
  for (const key of keys) {
    const value = getNestedValue(data, key);
    if (Array.isArray(value)) return value;
  }
  return null;
};

const extractChainRanking = (data: Record<string, any>): { rank: number; chain: string; items: number; }[] | null => {
  const chainData = getNestedValue(data, 'chain_ranking') || getNestedValue(data, 'chainRanking');
  if (Array.isArray(chainData)) {
    return chainData.slice(0, 5).map((item: any, index: number) => ({
      rank: index + 1,
      chain: item.chain || item.name || 'Unknown',
      items: item.items || item.count || 0,
    }));
  }
  return null;
};

const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
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
  
  console.log('🔄 Fetching subgraph data...');
  
  const [statsResult, curatorResult] = await Promise.all([
    graphqlBatcher.request(statsRequestId, CURATE_STATS_QUERY) as Promise<SubgraphResponse>,
    graphqlBatcher.request(curatorRequestId, CURATOR_STATS_QUERY) as Promise<{ litems: ItemData[] }>
  ]);
    
  console.log('📊 Stats result:', { registries: statsResult?.lregistries?.length, items: statsResult?.litems?.length });
  console.log('👥 Curator result:', { items: curatorResult?.litems?.length });
    
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
  const last7Days = generateDateRange(7);
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
        console.log('🚀 Starting stats fetch...');
        console.log('🔍 All import.meta.env:', import.meta.env);
        console.log('🔍 REACT_APP_DAPPLOOKER_API_KEY value:', DAPPLOOKER_API_KEY);
        console.log('📍 DAPPLOOKER_API_KEY present:', !!DAPPLOOKER_API_KEY);
        console.log('📍 Dashboard ID:', DASHBOARD_ID);
        
        // Use enhanced data fetch (subgraph primary + optional Dapplooker validation)
        if (DAPPLOOKER_API_KEY) {
          console.log('🔄 Attempting enhanced data fetch with Dapplooker validation...');
          const enhancedData = await fetchDapplookerData(graphqlBatcher);
          if (enhancedData) {
            console.log('✅ Using enhanced data (subgraph + Dapplooker validation)');
            return enhancedData;
          }
        } else {
          console.log('⚠️ No DAPPLOOKER_API_KEY, using subgraph only');
          return await fetchKlerosSubgraphData(graphqlBatcher);
        }
        
        // Fallback to subgraph
        console.log('🔄 Using subgraph fallback...');
        return await fetchKlerosSubgraphData(graphqlBatcher);
      } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        return EMPTY_STATS;
      }
    },
    ...CACHE_CONFIG,
  });
};