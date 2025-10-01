import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { queryKeys, REFETCH_INTERVAL, STALE_TIME } from './consts';
import { useGraphqlBatcher } from './useGraphqlBatcher';
import { ItemCounts } from '../../utils/itemCounts';
import { registryMap } from 'utils/items';
import { fetchRegistryDeposits, DepositParams } from '../../utils/fetchRegistryDeposits';

const FETCH_ITEM_COUNTS_QUERY = gql`
  query FetchItemCounts {
    Single_Tags: lregistry(id: "${registryMap.Single_Tags}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI
      }
    }
    Tags_Queries: lregistry(id: "${registryMap.Tags_Queries}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI
      }
    }
    CDN: lregistry(id: "${registryMap.CDN}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI
      }
    }
    Tokens: lregistry(id: "${registryMap.Tokens}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI
      }
    }
  }
`;

const convertStringFieldsToNumber = (obj: any): any => {
  let result: any = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      result[key] = convertStringFieldsToNumber(obj[key])
    } else if (typeof obj[key] === 'string') {
      result[key] = Number(obj[key])
    } else {
      result[key] = obj[key]
    }
  }

  return result
};

export const useItemCountsQuery = (enabled: boolean = true) => {
  const graphqlBatcher = useGraphqlBatcher();
  
  return useQuery({
    queryKey: queryKeys.itemCounts(),
    queryFn: async (): Promise<ItemCounts> => {
      const requestId = crypto.randomUUID();
      const result = await graphqlBatcher.request(requestId, FETCH_ITEM_COUNTS_QUERY);
      
      const itemCounts: ItemCounts = convertStringFieldsToNumber(result);

      // Fetch metadata for all registries
      const regMEs = await Promise.all([
        fetch('https://cdn.kleros.link' + result?.Single_Tags?.registrationMetaEvidence?.URI).then((r) => r.json()),
        fetch('https://cdn.kleros.link' + result?.Tags_Queries?.registrationMetaEvidence?.URI).then((r) => r.json()),
        fetch('https://cdn.kleros.link' + result?.CDN?.registrationMetaEvidence?.URI).then((r) => r.json()),
        fetch('https://cdn.kleros.link' + result?.Tokens?.registrationMetaEvidence?.URI).then((r) => r.json()),
      ]);

      // Inject metadata
      itemCounts.Single_Tags.metadata = {
        address: result?.Single_Tags?.id,
        policyURI: regMEs[0].fileURI,
        logoURI: regMEs[0].metadata.logoURI,
        tcrTitle: regMEs[0].metadata.tcrTitle,
        tcrDescription: regMEs[0].metadata.tcrDescription,
      };
      
      itemCounts.Tags_Queries.metadata = {
        address: result?.Tags_Queries?.id,
        policyURI: regMEs[1].fileURI,
        logoURI: regMEs[1].metadata.logoURI,
        tcrTitle: regMEs[1].metadata.tcrTitle,
        tcrDescription: regMEs[1].metadata.tcrDescription,
      };
      
      itemCounts.CDN.metadata = {
        address: result?.CDN?.id,
        policyURI: regMEs[2].fileURI,
        logoURI: regMEs[2].metadata.logoURI,
        tcrTitle: regMEs[2].metadata.tcrTitle,
        tcrDescription: regMEs[2].metadata.tcrDescription,
      };
      
      itemCounts.Tokens.metadata = {
        address: result?.Tokens?.id,
        policyURI: regMEs[3].fileURI,
        logoURI: regMEs[3].metadata.logoURI,
        tcrTitle: regMEs[3].metadata.tcrTitle,
        tcrDescription: regMEs[3].metadata.tcrDescription,
      };

      // Fetch registry deposits
      const regDs = await Promise.all([
        fetchRegistryDeposits(registryMap.Single_Tags),
        fetchRegistryDeposits(registryMap.Tags_Queries),
        fetchRegistryDeposits(registryMap.CDN),
        fetchRegistryDeposits(registryMap.Tokens),
      ]);

      itemCounts.Single_Tags.deposits = regDs[0] as DepositParams;
      itemCounts.Tags_Queries.deposits = regDs[1] as DepositParams;
      itemCounts.CDN.deposits = regDs[2] as DepositParams;
      itemCounts.Tokens.deposits = regDs[3] as DepositParams;

      return itemCounts;
    },
    enabled,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });
};