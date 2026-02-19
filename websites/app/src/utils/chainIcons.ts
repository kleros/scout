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
import MegaEthIcon from 'svgs/chains/megaeth.svg';
import LineaIcon from 'svgs/chains/linea.svg';
import PulseChainIcon from 'svgs/chains/pulsechain.svg';
import FuseIcon from 'svgs/chains/fuse.svg';
import MoonbeamIcon from 'svgs/chains/moonbeam.svg';
import PolygonZkevmIcon from 'svgs/chains/polygon-zkevm.svg';
import SonicIcon from 'svgs/chains/sonic.svg';
import CronosIcon from 'svgs/chains/cronos.svg';
import HarmonyIcon from 'svgs/chains/harmony.svg';
import MoonriverIcon from 'svgs/chains/moonriver.svg';
import BlastIcon from 'svgs/chains/blast.svg';
import BitcoinIcon from 'svgs/chains/bitcoin.svg';
import AuroraIcon from 'svgs/chains/aurora.svg';
import BittorrentIcon from 'svgs/chains/bittorrent.svg';
import BobaIcon from 'svgs/chains/boba.svg';
import WemixIcon from 'svgs/chains/wemix.svg';

const chainIconMap: Record<string, React.ComponentType<any>> = {
  '1': EthereumIcon,
  '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': SolanaIcon,
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
  '4326': MegaEthIcon,
  '59144': LineaIcon,
  '122': FuseIcon,
  '288': BobaIcon,
  '369': PulseChainIcon,
  '000000000019d6689c085ae165831e93': BitcoinIcon,
  '1284': MoonbeamIcon,
  '1666600000': HarmonyIcon,
  '1313161554': AuroraIcon,
  '1285': MoonriverIcon,
  '25': CronosIcon,
  '199': BittorrentIcon,
  '1101': PolygonZkevmIcon,
  '1111': WemixIcon,
  '146': SonicIcon,
  '81457': BlastIcon,
};

export const getChainIcon = (chainId: string) => chainIconMap[chainId] || null;
