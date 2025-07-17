import React from 'react'
import styled from 'styled-components'
import { chains } from 'utils/chains'
import { chainColorMap } from 'utils/colorMappings'
import { ExternalLink } from './ExternalLink';

const Container = styled.div`
  margin-bottom: 8px;
`

const StyledSpan = styled.span<{ bgColor: string }>`
  padding: 1px 4px;
  color: white;
  border-radius: 4px;
  background-color: ${(props) => props.bgColor};
  margin-right: 4px;
`

const truncateAddress = (addr: string) => {
  return `${addr?.substring(0, 6)}...${addr?.substring(addr.length - 4)}`
}

interface IAddressDisplay {
  address: string
}

const AddressDisplay: React.FC<IAddressDisplay> = ({ address }) => {
  const parts = address?.split(':')
  const keyForReference = `${parts?.[0]}:${parts?.[1]}`
  const reference = chains.find(
    (ref) => `${ref.namespace}:${ref.id}` === keyForReference
  )
  const bgColor = chainColorMap[keyForReference] || '#a0aec0'

  return (
    <Container>
      <StyledSpan bgColor={bgColor}>{reference?.label}</StyledSpan>
      {parts?.[2] && (
        <ExternalLink to={`https://${reference?.explorer}/address/${parts?.[2]}`} target="_blank" rel="noreferrer">
          {truncateAddress(parts?.[2])}
        </ExternalLink>
      )}
    </Container>
  )
}

export default AddressDisplay
