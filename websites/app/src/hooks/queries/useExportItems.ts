import { gql, request } from 'graphql-request';
import { GraphItem } from 'utils/items';
import { useQuery } from '@tanstack/react-query';
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index';
import { chains, getNamespaceForChainId } from 'utils/chains';

export interface ExportFilters {
  registryId?: string;
  status?: string[];
  disputed?: boolean[];
  fromDate?: string;
  toDate?: string;
  network?: string[];
  text?: string;
}

export const useExportItems = (filters: ExportFilters) => {
  return useQuery<GraphItem[]>({
    queryKey: ['exportItems', filters],
    enabled: false, // Only fetch when export button is clicked
    queryFn: async () => {
      let allData: GraphItem[] = [];
      const first = 1000;
      let skip = 0;
      let keepFetching = true;

      const {
        registryId,
        status = ['Registered'],
        disputed = [false, true],
        fromDate,
        toDate,
        network = [],
        text = ''
      } = filters;

      if (!registryId) {
        throw new Error('Registry ID is required for export');
      }

      const isTagsQueriesRegistry = registryId === '0xae6aaed5434244be3699c56e7ebc828194f26dc3';

      // Build network filter
      const selectedChainIds = network.filter((id) => id !== 'unknown');
      const includeUnknown = network.includes('unknown');
      const definedChainIds = chains.map((c) => c.id);
      const knownPrefixes = [...new Set(chains.map((chain) => {
        if (chain.namespace === 'solana') {
          return 'solana:';
        }
        return `${chain.namespace}:${chain.id}:`;
      }))];

      let networkQueryObject = '';
      if (isTagsQueriesRegistry && network.length > 0) {
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
      } else if (network.length > 0) {
        const conditions = selectedChainIds.map((chainId) => {
          const namespace = getNamespaceForChainId(chainId);
          if (namespace === 'solana') {
            return `{metadata_: {key0_starts_with_nocase: "solana:"}}`;
          }
          return `{metadata_: {key0_starts_with_nocase: "${namespace}:${chainId}:"}}`;
        });
        networkQueryObject = conditions.length > 0 ? `{or: [${conditions.join(',')}]}` : '{}';
      }

      // Build text filter
      const textFilterObject = text
        ? `{or: [
            {metadata_: {key0_contains_nocase: $text}},
            {metadata_: {key1_contains_nocase: $text}},
            {metadata_: {key2_contains_nocase: $text}},
            {metadata_: {key3_contains_nocase: $text}},
            {metadata_: {key4_contains_nocase: $text}}
          ]}`
        : '';

      // Build date filter
      let dateFilterObject = '';
      if (fromDate || toDate) {
        const conditions = [];
        if (fromDate) {
          const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
          conditions.push(`{latestRequestSubmissionTime_gte: "${fromTimestamp}"}`);
        }
        if (toDate) {
          const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
          conditions.push(`{latestRequestSubmissionTime_lte: "${toTimestamp}"}`);
        }
        dateFilterObject = conditions.length > 0 ? `{and: [${conditions.join(',')}]}` : '';
      }

      // Build the complete where clause
      const whereConditions = [
        `{registry: "${registryId}"}`,
        `{status_in: $status}`,
        `{disputed_in: $disputed}`,
        networkQueryObject && `${networkQueryObject}`,
        textFilterObject && `${textFilterObject}`,
        dateFilterObject && `${dateFilterObject}`
      ].filter(Boolean) as string[];

      const query = gql`
        query (
          $status: [String!]!
          $disputed: [Boolean!]!
          $text: String!
          $skip: Int!
          $first: Int!
          ${includeUnknown && isTagsQueriesRegistry ? '$definedChainIds: [String!]!' : ''}
        ) {
          litems(
            where: {
              and: [${whereConditions.join(',')}]
            }
            skip: $skip
            first: $first
            orderBy: "latestRequestSubmissionTime"
            orderDirection: desc
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

      try {
        while (keepFetching) {
          const variables: any = {
            status,
            disputed,
            text,
            skip,
            first,
          };
          if (includeUnknown && isTagsQueriesRegistry) {
            variables.definedChainIds = definedChainIds;
          }

          const result = (await request({
            url: SUBGRAPH_GNOSIS_ENDPOINT,
            document: query,
            variables,
          })) as any;

          let items = result.litems;

          // Client-side filtering for non-Tags_Queries registries
          if (!isTagsQueriesRegistry && network.length > 0) {
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

          allData = allData.concat(items);

          if (items.length < first) {
            keepFetching = false;
          }

          skip += first;
        }
      } catch (error) {
        console.error('Error fetching export data:', error);
        throw error;
      }

      return allData;
    },
  });
};