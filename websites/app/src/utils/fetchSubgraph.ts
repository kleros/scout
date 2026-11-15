import { indexerRequest } from 'hooks/queries/useGraphqlBatcher'

/**
 * Executes a GraphQL query against the Scout indexer (batched with other reads asked at the same
 * moment) and returns `{ data }`. A failed read throws: callers must show an error with a way to
 * retry, never treat it as an empty answer.
 */
export const fetchSubgraph = async <T = any>(
  query: string,
  variables: Record<string, any>,
): Promise<T> => {
  const data = await indexerRequest(query, variables)
  return { data } as T
}
