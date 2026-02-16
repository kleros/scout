import React from 'react'
import styled, { useTheme } from 'styled-components'
import { chains } from 'utils/chains'
import { chainColorMap } from 'utils/colorMappings'
import { getChainIcon } from 'utils/chainIcons'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import Copyable from 'components/Copyable'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
  position: relative;
`

const IconWrapper = styled.div`
  width: 20px;
  height: 20px;
  margin-right: 6px;
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
  color: ${({ theme }) => theme.primaryText};
  border-radius: 40px;
  font-size: 10px;
  font-weight: 500;
  background-color: ${(props) => props.bgColor};
  margin-right: 6px;
`

const StyledExternalLink = styled.a`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  text-decoration: none;

  :hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`

const StyledCopyable = styled(Copyable)`
  button {
    color: ${({ theme }) => theme.secondaryText};
    margin-left: -2px;

    &:hover {
      color: ${({ theme }) => theme.primaryText};
      opacity: 1;
    }
  }
`

const truncateAddress = (addr: string) => `${addr?.substring(0, 6)}...${addr?.substring(addr.length - 4)}`

interface IAddressDisplay {
  address: string
}

const AddressDisplay: React.FC<IAddressDisplay> = ({ address }) => {
  const theme = useTheme()
  const parts = address?.split(':')
  const keyForReference = `${parts?.[0]}:${parts?.[1]}`
  const reference = chains.find((ref) => `${ref.namespace}:${ref.id}` === keyForReference)
  const bgColor = chainColorMap[keyForReference] || theme.statusGray
  const ChainIcon = getChainIcon(reference?.id ?? '')

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
        <StyledCopyable
          copyableContent={parts[2].toLowerCase()}
          info="Copy Address"
        >
          <StyledExternalLink
            href={`https://${reference?.explorer}/address/${parts?.[2]}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {truncateAddress(parts[2])}
          </StyledExternalLink>
        </StyledCopyable>
      )}
    </Container>
  )
}

export default AddressDisplay
