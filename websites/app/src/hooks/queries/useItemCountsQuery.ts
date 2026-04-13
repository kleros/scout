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
import { KLEROS_CDN_BASE } from 'consts/index'

const fetchMetadataJson = async (uri: string): Promise<any | null> => {
  try {
    const response = await fetch(`${KLEROS_CDN_BASE}${uri}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

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

      // Fetch metadata for all registries independently — one failure must not block the others
      const registryKeys = ['single-tags', 'tags-queries', 'cdn', 'tokens'] as const
      const graphqlAliases = { 'single-tags': 'single_tags', 'tags-queries': 'tags_queries', 'cdn': 'cdn', 'tokens': 'tokens' } as const

      const metadataResults = await Promise.allSettled(
        registryKeys.map((key) => {
          const uri = result?.[graphqlAliases[key]]?.registrationMetaEvidence?.URI
          if (!uri) return Promise.resolve(null)
          return fetchMetadataJson(uri)
        }),
      )

      // Inject metadata — gracefully handle unavailable registries
      registryKeys.forEach((key, i) => {
        const settled = metadataResults[i]
        const me = settled.status === 'fulfilled' ? settled.value : null
        itemCounts[key].metadata = {
          address: result?.[graphqlAliases[key]]?.id,
          policyURI: me?.fileURI ?? '',
          logoURI: me?.metadata?.logoURI ?? '',
          tcrTitle: me?.metadata?.tcrTitle ?? '',
          tcrDescription: me?.metadata?.tcrDescription ?? '',
        }
      })

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
