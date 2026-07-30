import React from "react";

import { mainnet, gnosis, type AppKitNetwork } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { fallback, http, WagmiProvider, webSocket, type Transport } from "wagmi";

import { ALL_CHAINS } from "consts/chains";

// Alchemy only serves mainnet ENS name/avatar lookups for the connected
// wallet; the public mainnet leg below keeps those working without it, so a
// missing key degrades gracefully instead of blocking boot.
const alchemyApiKey = import.meta.env.ALCHEMY_API_KEY;
if (!alchemyApiKey) {
  console.warn("ALCHEMY_API_KEY is not set; mainnet reads (ENS) will rely on the public RPC only.");
}

export const getTransports = () => {
  const defaultTransport = (chain: AppKitNetwork) =>
    fallback([http(chain.rpcUrls.default?.http?.[0]), webSocket(chain.rpcUrls.default?.webSocket?.[0])]);

  // Alchemy-first (unchanged primary behavior), with a public fallback leg
  // so ENS display survives an Alchemy outage. Publicnode is pinned instead
  // of the chain default because viem's default (eth.merkle.io) aggressively
  // rate-limits.
  const mainnetTransports: Transport[] = alchemyApiKey
    ? [
        http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
        webSocket(`wss://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
      ]
    : [];
  mainnetTransports.push(http("https://ethereum-rpc.publicnode.com"));

  return {
    [gnosis.id]: defaultTransport(gnosis),
    [mainnet.id]: fallback(mainnetTransports), // Always enabled for ENS resolution
  };
};

const chains = ALL_CHAINS as [AppKitNetwork, ...AppKitNetwork[]];
const transports = getTransports();

const projectId = import.meta.env.WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("WalletConnect project ID is not set in WALLETCONNECT_PROJECT_ID environment variable.");
}

// Mainnet is wagmi-only (absent from the AppKit modal networks below): it
// exists solely so the ENS hooks (chainId: 1) have a configured client.
// Without it wagmi throws ChainNotConfiguredError and ENS never resolves.
export const wagmiAdapter = new WagmiAdapter({
  networks: [...chains, mainnet] as [AppKitNetwork, ...AppKitNetwork[]],
  projectId,
  transports,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: chains,
  defaultNetwork: gnosis,
  projectId,
  allowUnsupportedChain: true,
  themeVariables: {
    "--w3m-color-mix-strength": 20,
    // overlay portal is at 9999
    "--w3m-z-index": 10000,
  },
  features: {
    // adding these here to toggle in futute if needed
    // email: false,
    // socials: false,
    // onramp:false,
    // swap: false
  },
});
const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <WagmiProvider config={wagmiAdapter.wagmiConfig}> {children} </WagmiProvider>;
};

export default Web3Provider;
