import { isAddress } from 'ethers'
import request, { gql } from 'graphql-request'
import { registryMap } from './fetchItems'

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
  contractName?: {
    severity: 'warn' | 'error';
    message: string;
  };
  link?: {
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
    url: 'https://api.studio.thegraph.com/query/61738/legacy-curate-gnosis/version/latest',
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
  address: string,
  registry: string,
  domain?: string,
  projectName?: string,
  contractName?: string,
  link?: string
): Promise<Issue | null> => {
  let result: Issue = {};

  // check its an address. we dont check checksum.
  if (!isAddress(address)) {
    result.address = { message: 'Not a valid EVM address', severity: 'error' };
  }
  
  // if (registry === 'CDN' && !domain) return null
  // check its not a dupe.
  const ndupes = await getDupesInRegistry(
    chainId + ':' + address,
    registryMap[registry],
    domain  
  );

  if (ndupes > 0) {
    result.domain = { message: 'Duplicate submission', severity: 'error' };
  }

  if (projectName && projectName.length > 50) {
    result.projectName = { message: 'Project name too long (max 50 characters)', severity: 'error' };
  }
  if (contractName && contractName.length > 50) {
    result.contractName = { message: 'Contract name too long (max 50 characters)', severity: 'error' };
  }

  if (projectName && (projectName !== projectName.trim())) {
    result.projectName = { message: 'Project name has leading or trailing whitespace', severity: 'warn' };
  }
  if (contractName && (contractName !== contractName.trim())) {
    result.contractName = { message: 'Contract name has leading or trailing whitespace', severity: 'warn' };
  }

  return Object.keys(result).length > 0 ? result : null;
}

export default getAddressValidationIssue
