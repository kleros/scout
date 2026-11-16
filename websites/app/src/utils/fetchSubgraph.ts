import { indexerRequest, IndexerError } from 'hooks/queries/useGraphqlBatcher'

/**
 * Executes a GraphQL query against the Scout indexer, batched with other reads asked at the same
 * moment (see hooks/queries/useGraphqlBatcher), with the contract of the direct request it
 * replaces: resolves `{ data }`; when the indexer answers with GraphQL errors, resolves
 * `{ data: undefined, errors: [{ message }] }` (callers check `json.errors`); when the indexer
 * cannot be reached or answers without data, throws, so react-query retries the read as before.
 */
export const fetchSubgraph = async <T = any>(
  query: string,
  variables: Record<string, any>,
): Promise<T> => {
  try {
    const data = await indexerRequest(query, variables)
    return { data } as T
  } catch (error) {
    if (error instanceof IndexerError && Array.isArray(error.errors) && error.errors.length > 0) {
      const fallback = error.message
      const errors = (error.errors as Array<{ message?: unknown }>).map((e) => ({
        message: typeof e?.message === 'string' ? e.message : fallback,
      }))
      return { data: undefined, errors } as T
    }
    throw error
  }
}
