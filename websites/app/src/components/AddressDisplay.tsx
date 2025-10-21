import React from 'react'
import styled from 'styled-components'
import { chains } from 'utils/chains'
import { chainColorMap } from 'utils/colorMappings'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import NewTabIcon from 'svgs/icons/new-tab.svg'

import ArbitrumIcon from 'svgs/chains/arbitrum.svg'
import AvalancheIcon from 'svgs/chains/avalanche.svg'
import BaseIcon from 'svgs/chains/base.svg'
import BnbIcon from 'svgs/chains/bnb.svg'
import CeloIcon from 'svgs/chains/celo.svg'
import EthereumIcon from 'svgs/chains/ethereum.svg'
import FantomIcon from 'svgs/chains/fantom.svg'
import GnosisIcon from 'svgs/chains/gnosis.svg'
import OptimismIcon from 'svgs/chains/optimism.svg'
import PolygonIcon from 'svgs/chains/polygon.svg'
import ScrollIcon from 'svgs/chains/scroll.svg'
import SolanaIcon from 'svgs/chains/solana.svg'
import ZkSyncIcon from 'svgs/chains/zksync.svg'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
`

const IconWrapper = styled.div`
  width: 20px;
  height: 20px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  & > svg {
    width: 100%;
    height: 100%;
  }
`

const StyledSpan = styled.span<{ bgColor: string }>`
  padding: 2px 6px;
  color: white;
  border-radius: 40px;
  font-size: 10px;
  font-weight: 500;
  background-color: ${(props) => props.bgColor};
  margin-right: 8px;
`

const StyledExternalLink = styled.a`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 4px;
  text-decoration: none;

  svg {
    fill: ${({ theme }) => theme.secondaryText};
  }

  :hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: none;

    svg {
      fill: ${({ theme }) => theme.primaryText};
    }
  }
`

const StyledNewTabIcon = styled(NewTabIcon)`
  margin-bottom: 2px;
`

const truncateAddress = (addr: string) => `${addr?.substring(0, 6)}...${addr?.substring(addr.length - 4)}`

const chainIconMap: Record<string, React.ComponentType<any>> = {
  '42161': ArbitrumIcon,
  '43114': AvalancheIcon,
  '8453': BaseIcon,
  '56': BnbIcon,
  '42220': CeloIcon,
  '1': EthereumIcon,
  '250': FantomIcon,
  '100': GnosisIcon,
  '10': OptimismIcon,
  '137': PolygonIcon,
  '534352': ScrollIcon,
  '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': SolanaIcon,
  '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': SolanaIcon,
  '324': ZkSyncIcon,
}

interface IAddressDisplay {
  address: string
}

const AddressDisplay: React.FC<IAddressDisplay> = ({ address }) => {
  const parts = address?.split(':')
  const keyForReference = `${parts?.[0]}:${parts?.[1]}`
  const reference = chains.find((ref) => `${ref.namespace}:${ref.id}` === keyForReference)
  const bgColor = chainColorMap[keyForReference] || '#a0aec0'
  const ChainIcon = chainIconMap[reference?.id ?? '']

  return (
    <Container>
      {ChainIcon ? (
        <IconWrapper>
          <ChainIcon />
        </IconWrapper>
      ) : (
        <StyledSpan bgColor={bgColor}>{reference?.label}</StyledSpan>
      )}
      {parts?.[2] && (
        <StyledExternalLink
          href={`https://${reference?.explorer}/address/${parts?.[2]}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {truncateAddress(parts?.[2])} <StyledNewTabIcon />
        </StyledExternalLink>
      )}
    </Container>
  )
}

export default AddressDisplay
