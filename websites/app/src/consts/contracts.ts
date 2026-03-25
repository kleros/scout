import { Address } from 'viem';
import { gnosis } from '@reown/appkit/networks';

export const klerosLiquidAddresses: Record<number, Address> = {
  [gnosis.id]: '0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002' as Address
} as const;

export const registries = {
  'single-tags': { address: '0x66260c69d03837016d88c9877e61e08ef74c59f2' as Address, deploymentBlock: 28_100_000 },
  'tags-queries': { address: '0xae6aaed5434244be3699c56e7ebc828194f26dc3' as Address, deploymentBlock: 33_600_000 },
  'cdn': { address: '0x957a53a994860be4750810131d9c876b2f52d6e1' as Address, deploymentBlock: 25_800_000 },
  'tokens': { address: '0xee1502e29795ef6c2d60f8d7120596abe3bad990' as Address, deploymentBlock: 30_200_000 },
} as const;

export type RegistryType = keyof typeof registries;

// Convenience map for code that only needs the address
export const registryAddresses = Object.fromEntries(
  Object.entries(registries).map(([k, v]) => [k, v.address])
) as Record<RegistryType, Address>;