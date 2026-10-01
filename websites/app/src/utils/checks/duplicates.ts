import request, { gql } from 'graphql-request'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index'

// Duplicate lookups against the Scout indexer. An item is only a duplicate of
// an entry that currently occupies the registry (registered or pending).

export const getDupesInRegistry = async (
  richAddress: string,
  registryAddress: string,
  domain?: string,
): Promise<number> => {
  const query = gql`
    query ($registry: String!, $richAddress: String!, $domain: String) {
      litems: LItem(
        where: {
          registry_id: { _eq: $registry }
          status: { _in: [ "Registered", "ClearingRequested", "RegistrationRequested"] }
          key0: { _ilike: $richAddress }
          ${domain ? `key1: { _ilike: $domain }` : ''}
        }
      ) {
        id
      }
    }
  `

  const variables: Record<string, any> = {
    registry: registryAddress,
    richAddress: `%${richAddress}%`, // contains
  }
  if (domain) {
    variables.domain = `${domain}%` // starts with
  }

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables,
  })) as any
  const items = result.litems
  return items.length
}

export const getTokenDupesWithWebsiteCheck = async (
  richAddress: string,
  registryAddress: string,
): Promise<number> => {
  const query = gql`
    query ($registry: String!, $richAddress: String!) {
      litems: LItem(
        where: {
          registry_id: { _eq: $registry }
          status: {
            _in: ["Registered", "ClearingRequested", "RegistrationRequested"]
          }
          key0: { _ilike: $richAddress }
        }
      ) {
        id
        key3
      }
    }
  `

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables: {
      registry: registryAddress,
      richAddress,
    },
  })) as any

  // Only count duplicates if existing items have a website (key3)
  const duplicatesWithWebsite = result.litems.filter(
    (item: any) => item?.key3 && item.key3.trim() !== '',
  )

  return duplicatesWithWebsite.length
}

// Escape Postgres LIKE wildcards (% _ \) so a value matched with `_ilike`
// behaves as a literal, case-insensitive equality check rather than a pattern.
// Github repo names legitimately contain underscores, which `_ilike` would
// otherwise treat as "any single character" and over-match.
const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`)

// For the Address Tags Query (tags-queries) registry, an entry is uniquely
// identified by the combination of Github Repository, Commit hash and EVM Chain
// ID. These are stored in key0/key1/key2, but the column order is NOT stable:
// the order is derived from each item's own IPFS metadata, which has changed
// over time. Across all 197 live entries the three values appear only as
// rotations of [repo, hash, chainId] (repo never lands in the middle), but
// rather than rely on a fixed position we match position-agnostically: each of
// the three identifiers must appear in some key field of the SAME item. The
// values are distinct enough (a repo URL, a hex/numeric hash, a numeric chain
// id) that cross-position false matches are not a practical concern, and a
// genuinely new submission always introduces at least one unseen value so it is
// never wrongly flagged.
//
// The repo is matched against both its bare form and its `.git` form because
// both spellings exist in the registry; without this, e.g. `…/foo` would fail
// to match a stored `…/foo.git` and a real duplicate would slip through.
export const getTagsQueriesDupes = async (
  githubRepository: string,
  commitHash: string,
  evmChainId: string,
  registryAddress: string,
): Promise<number> => {
  const normalizedRepo = githubRepository
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
  const repo = escapeLike(normalizedRepo)
  const repoGit = `${repo}.git`
  const hash = escapeLike(commitHash.trim())

  const query = gql`
    query (
      $registry: String!
      $repo: String!
      $repoGit: String!
      $commitHash: String!
      $evmChainId: String!
    ) {
      litems: LItem(
        where: {
          registry_id: { _eq: $registry }
          status: {
            _in: ["Registered", "ClearingRequested", "RegistrationRequested"]
          }
          _and: [
            {
              _or: [
                { key0: { _ilike: $repo } }
                { key1: { _ilike: $repo } }
                { key2: { _ilike: $repo } }
                { key0: { _ilike: $repoGit } }
                { key1: { _ilike: $repoGit } }
                { key2: { _ilike: $repoGit } }
              ]
            }
            {
              _or: [
                { key0: { _ilike: $commitHash } }
                { key1: { _ilike: $commitHash } }
                { key2: { _ilike: $commitHash } }
              ]
            }
            {
              _or: [
                { key0: { _eq: $evmChainId } }
                { key1: { _eq: $evmChainId } }
                { key2: { _eq: $evmChainId } }
              ]
            }
          ]
        }
      ) {
        id
      }
    }
  `

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables: {
      registry: registryAddress,
      repo,
      repoGit,
      commitHash: hash,
      evmChainId: evmChainId.trim(),
    },
  })) as any
  return result.litems.length
}
