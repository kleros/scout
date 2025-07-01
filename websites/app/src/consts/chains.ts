import { type AppKitNetwork, gnosis } from "@reown/appkit/networks";
import { type Chain, extractChain } from "viem";

export const DEFAULT_CHAIN = gnosis.id;

// Read/Write
export const SUPPORTED_CHAINS: Record<number, AppKitNetwork> = {
  [gnosis.id]: gnosis,
};

// Read Only
export const QUERY_CHAINS: Record<number, AppKitNetwork> = {
  [gnosis.id]: gnosis,
};

export const ALL_CHAINS = [...Object.values(SUPPORTED_CHAINS), ...Object.values(QUERY_CHAINS)];

export const SUPPORTED_CHAIN_IDS = Object.keys(SUPPORTED_CHAINS);

export const QUERY_CHAIN_IDS = Object.keys(QUERY_CHAINS);

export const getChain = (chainId: number): Chain | null =>
  extractChain({
    chains: ALL_CHAINS,
    id: chainId,
  });
