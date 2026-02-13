import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { queryKeys, REFETCH_INTERVAL, STALE_TIME } from './consts'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { ItemCounts } from '../../utils/itemCounts'
import { registryMap } from 'utils/items'
import {
  fetchRegistryDeposits,
  DepositParams,
} from '../../utils/fetchRegistryDeposits'

const FETCH_ITEM_COUNTS_QUERY = gql`
  query FetchItemCounts {
    single_tags: LRegistry_by_pk(id: "${registryMap['single-tags']}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI: uri
      }
    }
    tags_queries: LRegistry_by_pk(id: "${registryMap['tags-queries']}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI: uri
      }
    }
    cdn: LRegistry_by_pk(id: "${registryMap['cdn']}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI: uri
      }
    }
    tokens: LRegistry_by_pk(id: "${registryMap['tokens']}") {
      id
      numberOfAbsent
      numberOfRegistered
      numberOfClearingRequested
      numberOfChallengedClearing
      numberOfRegistrationRequested
      numberOfChallengedRegistrations
      registrationMetaEvidence {
        URI: uri
      }
    }
  }
`

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
}

export const useItemCountsQuery = (enabled: boolean = true) => {
  const graphqlBatcher = useGraphqlBatcher()

  return useQuery({
    queryKey: queryKeys.itemCounts(),
    queryFn: async (): Promise<ItemCounts> => {
      const requestId = crypto.randomUUID()
      const result = await graphqlBatcher.request(
        requestId,
        FETCH_ITEM_COUNTS_QUERY,
      )

      // GraphQL aliases use underscores (single_tags, tags_queries);
      // map them to the hyphenated keys expected by ItemCounts.
      const converted = convertStringFieldsToNumber(result)
      const itemCounts: ItemCounts = {
        'single-tags': converted.single_tags,
        'tags-queries': converted.tags_queries,
        'cdn': converted.cdn,
        'tokens': converted.tokens,
      }

      // Fetch metadata for all registries
      const regMEs = await Promise.all([
        fetch(
          'https://cdn.kleros.link' +
            result?.single_tags?.registrationMetaEvidence?.URI,
        ).then((r) => r.json()),
        fetch(
          'https://cdn.kleros.link' +
            result?.tags_queries?.registrationMetaEvidence?.URI,
        ).then((r) => r.json()),
        fetch(
          'https://cdn.kleros.link' +
            result?.cdn?.registrationMetaEvidence?.URI,
        ).then((r) => r.json()),
        fetch(
          'https://cdn.kleros.link' +
            result?.tokens?.registrationMetaEvidence?.URI,
        ).then((r) => r.json()),
      ])

      // Inject metadata
      itemCounts['single-tags'].metadata = {
        address: result?.single_tags?.id,
        policyURI: regMEs[0].fileURI,
        logoURI: regMEs[0].metadata.logoURI,
        tcrTitle: regMEs[0].metadata.tcrTitle,
        tcrDescription: regMEs[0].metadata.tcrDescription,
      }

      itemCounts['tags-queries'].metadata = {
        address: result?.tags_queries?.id,
        policyURI: regMEs[1].fileURI,
        logoURI: regMEs[1].metadata.logoURI,
        tcrTitle: regMEs[1].metadata.tcrTitle,
        tcrDescription: regMEs[1].metadata.tcrDescription,
      }

      itemCounts['cdn'].metadata = {
        address: result?.cdn?.id,
        policyURI: regMEs[2].fileURI,
        logoURI: regMEs[2].metadata.logoURI,
        tcrTitle: regMEs[2].metadata.tcrTitle,
        tcrDescription: regMEs[2].metadata.tcrDescription,
      }

      itemCounts['tokens'].metadata = {
        address: result?.tokens?.id,
        policyURI: regMEs[3].fileURI,
        logoURI: regMEs[3].metadata.logoURI,
        tcrTitle: regMEs[3].metadata.tcrTitle,
        tcrDescription: regMEs[3].metadata.tcrDescription,
      }

      // Fetch registry deposits
      const regDs = await Promise.all([
        fetchRegistryDeposits(registryMap['single-tags']),
        fetchRegistryDeposits(registryMap['tags-queries']),
        fetchRegistryDeposits(registryMap['cdn']),
        fetchRegistryDeposits(registryMap['tokens']),
      ])

      itemCounts['single-tags'].deposits = regDs[0] as DepositParams
      itemCounts['tags-queries'].deposits = regDs[1] as DepositParams
      itemCounts['cdn'].deposits = regDs[2] as DepositParams
      itemCounts['tokens'].deposits = regDs[3] as DepositParams

      return itemCounts
    },
    enabled,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  })
}
