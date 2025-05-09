export const getNamespaceForChainId = (chainId: string) => {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.namespace;
};

export const chains = [
  {
    id: '1',
    namespace: 'eip155',
    name: 'Ethereum Mainnet',
    label: 'ETH',
    explorer: 'etherscan.io',
  },
  {
    id: '56',
    namespace: 'eip155',
    name: 'Binance Smart Chain',
    label: 'BSC',
    explorer: 'bscscan.com',
  },
  {
    id: '100',
    namespace: 'eip155',
    name: 'Gnosis Chain',
    label: 'Gnosis',
    explorer: 'gnosisscan.io',
  },
  {
    id: '137',
    namespace: 'eip155',
    name: 'Polygon',
    label: 'MATIC',
    explorer: 'polygonscan.com',
  },
  {
    deprecated: true,
    id: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
    namespace: 'solana',
    name: 'Solana',
    label: 'SOL',
    explorer: 'solscan.io',
  },
  {
    id: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    namespace: 'solana',
    name: 'Solana',
    label: 'SOL',
    explorer: 'solscan.io',
  },
  {
    id: '42161',
    namespace: 'eip155',
    name: 'Arbitrum One',
    label: 'ARB',
    explorer: 'arbiscan.io',
  },
  {
    id: '534352',
    namespace: 'eip155',
    name: 'Scroll',
    label: 'Scroll',
    explorer: 'scrollscan.com',
  },
  {
    id: '10',
    namespace: 'eip155',
    name: 'Optimism',
    label: 'OP',
    explorer: 'optimistic.etherscan.io',
  },
  {
    id: '43114',
    namespace: 'eip155',
    name: 'Avalanche C-Chain',
    label: 'AVAX',
    explorer: 'snowscan.xyz',
  },
  {
    id: '42220',
    namespace: 'eip155',
    name: 'Celo Mainnet',
    label: 'CELO',
    explorer: 'celoscan.io',
  },
  {
    id: '8453',
    namespace: 'eip155',
    name: 'Base Mainnet',
    label: 'Base',
    explorer: 'basescan.org',
  },
  {
    id: '250',
    namespace: 'eip155',
    name: 'Fantom Opera',
    label: 'FTM',
    explorer: 'ftmscan.com',
  },
  {
    id: '324',
    namespace: 'eip155',
    name: 'zkSync',
    label: 'zkSync',
    explorer: 'era.zksync.network',
  }
]