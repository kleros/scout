import React, { useState } from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import AddressDisplay from 'components/AddressDisplay'

const ImageContainer = styled.div`
  margin-left: 4px;
`

const ImageWithSkeleton = ({ src, alt }) => {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <ImageContainer>
      {!imgLoaded && <Skeleton height={100} width={100} />}
      <img
        src={src}
        alt={alt}
        style={{ display: imgLoaded ? 'block' : 'none' }}
        onLoad={() => setImgLoaded(true)}
      />
    </ImageContainer>
  )
}

export const renderValue = (key, value) => {
  if (typeof value === 'string') {
    if (value.startsWith('/ipfs/')) {
      return (
        <ImageWithSkeleton src={`https://ipfs.kleros.io${value}`} alt={key} />
      )
    } else if (
      ['Address', 'Contract Address', 'Contract address'].includes(key)
    ) {
      return <AddressDisplay address={value} />
    } else if (key === 'Decimals') {
      return String(parseInt(value))
    }
  }
  return value
}
