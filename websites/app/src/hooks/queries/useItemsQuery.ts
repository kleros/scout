import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { queryKeys, REFETCH_INTERVAL, STALE_TIME } from './consts';
import { useGraphqlBatcher } from './useGraphqlBatcher';
import { GraphItem, registryMap } from 'utils/items';
import { ITEMS_PER_PAGE } from '../../pages/Registries/index';
import { chains, getNamespaceForChainId } from '../../utils/chains';

interface UseItemsQueryParams {
  searchParams: URLSearchParams;
  chainFilters?: string[];
  enabled?: boolean;
}

export const useItemsQuery = ({ searchParams, chainFilters = [], enabled = true }: UseItemsQueryParams) => {
  const graphqlBatcher = useGraphqlBatcher();
  
  const registry = searchParams.getAll('registry');
  const status = searchParams.getAll('status');
  const disputed = searchParams.getAll('disputed');
  const network = chainFilters;
  const text = searchParams.get('text') || '';
  const orderDirection = searchParams.get('orderDirection') || 'desc';
  const page = Number(searchParams.get('page')) || 1;

  const shouldFetch = enabled && 
    registry.length > 0 && 
    status.length > 0 && 
    disputed.length > 0 && 
    page > 0;

  return useQuery({
    queryKey: [...queryKeys.items(searchParams), chainFilters],
    queryFn: async () => {
      if (!shouldFetch) return [];

      const isTagsQueriesRegistry = registry.includes('Tags_Queries');
      const selectedChainIds = network.filter((id) => id !== 'unknown');
      const includeUnknown = network.includes('unknown');
      const definedChainIds = chains.map((c) => c.id);
      
      // Build network filter based on registry type
      let networkQueryObject = '';
      if (isTagsQueriesRegistry) {
        const conditions = selectedChainIds.map(
          (chainId) =>
            `{or: [{metadata_: {key2: "${chainId}"}}, {metadata_: {key1: "${chainId}"}}]}`
        );
        if (includeUnknown) {
          conditions.push(
            `{and: [{metadata_: {key1_not_in: $definedChainIds}}, {metadata_: {key2_not_in: $definedChainIds}}]}`
          );
        }
        networkQueryObject = conditions.length > 0 ? `{or: [${conditions.join(',')}]}` : '{}';
      } else {
        const conditions = selectedChainIds.map((chainId) => {
          const namespace = getNamespaceForChainId(chainId);
          if (namespace === 'solana') {
            return `{metadata_: {key0_starts_with_nocase: "solana:"}}`;
          }
          return `{metadata_: {key0_starts_with_nocase: "${namespace}:${chainId}:"}}`;
        });
        networkQueryObject = conditions.length > 0 ? `{or: [${conditions.join(',')}]}` : '{}';
      }

      const textFilterObject = text
        ? `{or: [
            {metadata_: {key0_contains_nocase: $text}},
            {metadata_: {key1_contains_nocase: $text}},
            {metadata_: {key2_contains_nocase: $text}},
            {metadata_: {key3_contains_nocase: $text}},
            {metadata_: {key4_contains_nocase: $text}}
          ]}`
        : '';

      // Build the complete query with filters
      const queryWithFilters = gql`
        query FetchItems(
          $registry: [String!]!
          $status: [String!]!
          $disputed: [Boolean!]!
          $text: String!
          $skip: Int!
          $first: Int!
          $orderDirection: OrderDirection!
          ${includeUnknown && isTagsQueriesRegistry ? '$definedChainIds: [String!]!' : ''}
        ) {
          litems(
            where: {
              and: [
                {registry_in: $registry},
                {status_in: $status},
                {disputed_in: $disputed},
                ${networkQueryObject},
                ${text === '' ? '' : textFilterObject}
              ]
            }
            skip: $skip
            first: $first
            orderBy: "latestRequestSubmissionTime"
            orderDirection: $orderDirection
          ) {
            id
            latestRequestSubmissionTime
            registryAddress
            itemID
            status
            disputed
            data
            metadata {
              key0
              key1
              key2
              key3
              key4
              props {
                value
                type
                label
                description
                isIdentifier
              }
            }
            requests(first: 1, orderBy: submissionTime, orderDirection: desc) {
              disputed
              disputeID
              submissionTime
              resolved
              requester
              challenger
              resolutionTime
              deposit
              rounds(first: 1, orderBy: creationTime, orderDirection: desc) {
                appealPeriodStart
                appealPeriodEnd
                ruling
                hasPaidRequester
                hasPaidChallenger
                amountPaidRequester
                amountPaidChallenger
              }
            }
          }
        }
      `;

      const variables: any = {
        registry: registry.map((r) => registryMap[r]),
        status,
        disputed: disputed.map((e) => e === 'true'),
        text,
        skip: (page - 1) * ITEMS_PER_PAGE,
        first: ITEMS_PER_PAGE + 1,
        orderDirection,
      };

      if (includeUnknown && isTagsQueriesRegistry) {
        variables.definedChainIds = definedChainIds;
      }

      const requestId = crypto.randomUUID();
      const result = await graphqlBatcher.request(requestId, queryWithFilters, variables);
      
      let items: GraphItem[] = result.litems;

      // Client-side filtering for non-Tags_Queries registries
      if (!isTagsQueriesRegistry && network.length > 0) {
        const knownPrefixes = [...new Set(chains.map((chain) => {
          if (chain.namespace === 'solana') {
            return 'solana:';
          }
          return `${chain.namespace}:${chain.id}:`;
        }))];

        const selectedPrefixes = selectedChainIds.map((chainId) => {
          const namespace = getNamespaceForChainId(chainId);
          if (namespace === 'solana') {
            return 'solana:';
          }
          return `${namespace}:${chainId}:`;
        });

        items = items.filter((item: GraphItem) => {
          const key0 = item.metadata?.key0?.toLowerCase() || '';
          const matchesSelectedChain = selectedPrefixes.length > 0
            ? selectedPrefixes.some((prefix) => key0.startsWith(prefix.toLowerCase()))
            : false;

          const isUnknownChain = !knownPrefixes.some((prefix) => key0.startsWith(prefix.toLowerCase()));

          return (selectedPrefixes.length > 0 && matchesSelectedChain) || (includeUnknown && isUnknownChain);
        });
      }

      return items;
    },
    enabled: shouldFetch,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });
};