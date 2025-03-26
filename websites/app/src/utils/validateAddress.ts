import { isAddress } from 'ethers'
import request, { gql } from 'graphql-request'
import { registryMap } from './fetchItems'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index';
import { PublicKey } from '@solana/web3.js'
import { chains } from 'utils/chains'

const isSolanaAddress = (value: string) => {
  try {
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

const isValidAddressForChain = (chainId: string, address: string): boolean => {
  const network = chains.find(chain => `${chain.namespace}:${chain.id}` === chainId)

  if (!network) return false
  if (network.namespace === 'solana') return isSolanaAddress(address)
  if (network.namespace === 'eip155') return isAddress(address)
  return false
}

export interface Issue {
  address?: {
    severity: 'warn' | 'error';
    message: string;
  };
  domain?: {
    severity: 'warn' | 'error';
    message: string;
  };
  contract?: {
    severity: 'warn' | 'error';
    message: string;
  };
  projectName?: {
    severity: 'warn' | 'error';
    message: string;
  };
  publicNameTag?: {
    severity: 'warn' | 'error';
    message: string;
  };
  link?: {
    severity: 'warn' | 'error';
    message: string;
  };
  symbol?: {
    severity: 'warn' | 'error';
    message: string;
  };
}

const getDupesInRegistry = async (
  richAddress: string,
  registryAddress: string,
  domain?: string
): Promise<number> => {
  const query = gql`
    query ($registry: String!, $richAddress: String!) {
      litems(
        where: {
          registry: $registry,
          status_in: ["Registered", "ClearingRequested"],
          metadata_ : { key0_contains_nocase: $richAddress,
            ${domain ? `key1_starts_with_nocase: "${domain}"` : ''}
              },
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
      richAddress,
    },
  })) as any
  const items = result.litems
  return items.length
}

// null
const getAddressValidationIssue = async (
  chainId: string,
  registry: string,
  address?: string,
  domain?: string,
  projectName?: string,
  publicNameTag?: string,
  link?: string,
  symbol?: string
): Promise<Issue | null> => {
  let result: Issue = {};

  // Validate the address based on the chainId
  if (address && !isValidAddressForChain(chainId, address)) {
    result.address = { message: 'Invalid address for the specified chain', severity: 'error' };
  }

  // check its not a dupe.
  const ndupes = await getDupesInRegistry(
    chainId + ':' + address,
    registryMap[registry],
    domain
  );

  if (ndupes > 0) {
    result.domain = { message: 'Duplicate submission', severity: 'error' };
  }

  if (publicNameTag && publicNameTag?.length > 50) {
    result.publicNameTag = { message: 'Public Name Tag too long (max 50 characters)', severity: 'error' };
  }

  if (projectName && (projectName !== projectName.trim())) {
    result.projectName = { message: 'Project name has leading or trailing whitespace', severity: 'warn' };
  }

  if (registry === "Tokens" && projectName && projectName.length > 40) {
    result.projectName = { message: 'Public Name too long (max 40 characters)', severity: 'warn' };
  }

  if (registry === "Tokens" && symbol && symbol.length > 20) {
    result.symbol = { message: 'Symbol too long (max 20 characters)', severity: 'warn' };
  }

  if (publicNameTag && (publicNameTag !== publicNameTag.trim())) {
    result.publicNameTag = { message: 'Public Name Tag has leading or trailing whitespace', severity: 'warn' };
  }

  const cdnRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;

  if (domain && !cdnRegex.test(domain)) {
    result.domain = { message: 'Invalid website format for CDN. Must be a valid domain', severity: 'error' };
  }

  const tagRegex = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;

  if (link && !tagRegex.test(link)) {
    result.link = { message: 'Invalid website format. Must start with http(s):// and include a valid domain', severity: 'error' };
  }

  return Object.keys(result).length > 0 ? result : null;
}

export default getAddressValidationIssue
