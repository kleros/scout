import EthereumIcon from 'svgs/chains/ethereum.svg';
import SolanaIcon from 'svgs/chains/solana.svg';
import BaseIcon from 'svgs/chains/base.svg';
import CeloIcon from 'svgs/chains/celo.svg';
import ScrollIcon from 'svgs/chains/scroll.svg';
import FantomIcon from 'svgs/chains/fantom.svg';
import ZkSyncIcon from 'svgs/chains/zksync.svg';
import GnosisIcon from 'svgs/chains/gnosis.svg';
import PolygonIcon from 'svgs/chains/polygon.svg';
import OptimismIcon from 'svgs/chains/optimism.svg';
import ArbitrumIcon from 'svgs/chains/arbitrum.svg';
import AvalancheIcon from 'svgs/chains/avalanche.svg';
import BnbIcon from 'svgs/chains/bnb.svg';

export const getChainIcon = (chainId: string) => {
  const iconMap: Record<string, React.FunctionComponent<React.SVGProps<SVGSVGElement>>> = {
    '1': EthereumIcon,
    '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': SolanaIcon,
    '8453': BaseIcon,
    '42220': CeloIcon,
    '534352': ScrollIcon,
    '250': FantomIcon,
    '324': ZkSyncIcon,
    '100': GnosisIcon,
    '137': PolygonIcon,
    '10': OptimismIcon,
    '42161': ArbitrumIcon,
    '43114': AvalancheIcon,
    '56': BnbIcon,
  };
  return iconMap[chainId] || null;
};
