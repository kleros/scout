import React, { useState } from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import AddressDisplay from 'components/AddressDisplay'
import { useSearchParams } from 'react-router-dom'
import { useScrollTop } from 'hooks/useScrollTop'

const ImageContainer = styled.div`
  margin-left: 4px;
`

const StyledButton = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
`;

export const StyledWebsiteAnchor = styled.a`
  color: #fff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ImageWithSkeleton = ({ src, alt }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [, setSearchParams] = useSearchParams()

  const scrollTop = useScrollTop();

  return (
    <ImageContainer>
      <StyledButton
        onClick={() => {
          setSearchParams({ attachment: src });
          scrollTop();
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
    const href =
      value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `https://${value}`
    return (
      <StyledWebsiteAnchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {value}
      </StyledWebsiteAnchor>
    )
  }

  return value
}
