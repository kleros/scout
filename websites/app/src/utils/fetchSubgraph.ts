import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts'

/** Executes a GraphQL query against the Gnosis subgraph endpoint. */
export const fetchSubgraph = async <T = any>(
  query: string,
  variables: Record<string, any>,
): Promise<T> => {
  const response = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await response.json()
  return json
}
