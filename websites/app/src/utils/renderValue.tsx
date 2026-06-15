import React, { useState } from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import AddressDisplay from 'components/AddressDisplay'
import SafeLink from 'components/SafeLink'
import { useAttachment } from 'hooks/useAttachment'
import { hoverShortTransitionTiming } from 'styles/commonStyles';

const ImageContainer = styled.div`
  margin-left: 4px;
`

const StyledButton = styled.button`
  ${hoverShortTransitionTiming}
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;

  &:hover {
    filter: brightness(0.8);
  }
`;

export const StyledWebsiteAnchor = styled(SafeLink)`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.secondaryText};
  text-decoration: underline;
  font-size: 14px;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const ImageWithSkeleton = ({ src, alt }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const openAttachment = useAttachment();

  return (
    <ImageContainer>
      <StyledButton
        onClick={() => {
          openAttachment(src);
        }}
      >
        {!imgLoaded && <Skeleton height={100} width={100} />}
        <img
          src={src}
          alt={alt}
          style={{ display: imgLoaded ? '' : 'none' }}
          onLoad={() => setImgLoaded(true)}
        />
      </StyledButton>
    </ImageContainer>
  )
}

export const renderValue = (key, value) => {
  if (typeof value === 'string' && value.startsWith('/ipfs/')) {
    return (
      <ImageWithSkeleton src={`https://cdn.kleros.link${value}`} alt={key} />
    )
  }

  if (['Address', 'Contract Address', 'Contract address'].includes(key)) {
    return <AddressDisplay address={value} />
  }

  if (key === 'Decimals') {
    return String(parseInt(value))
  }

  if (['Domain name', 'UI/Website Link', 'Website'].includes(key) && value) {
    return <StyledWebsiteAnchor url={value}>{value}</StyledWebsiteAnchor>
  }

  return value
}
