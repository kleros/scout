import React from 'react'
import styled from 'styled-components'
import { chains } from 'utils/chains'
import { chainColorMap } from 'utils/colorMappings'

const Container = styled.div`
  margin-top: 4px;
`

const StyledSpan = styled.span<{ bgColor: string }>`
  padding: 1px 4px;
  color: white;
  border-radius: 4px;
  background-color: ${(props) => props.bgColor};
  margin-right: 4px;
`

const StyledAddressA = styled.a`
  text-decoration: underline;
  color: #fff;
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
        <StyledAddressA
          target="_blank"
          href={`https://${reference?.explorer}/address/${parts?.[2]}`}
        >
          {truncateAddress(parts?.[2])}
        </StyledAddressA>
      )}
    </Container>
  )
}

export default AddressDisplay
