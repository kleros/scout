import React from 'react'
import styled from 'styled-components'
import LoadingGif from 'gifs/loading-icosahedron.gif'

const Container = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`

const LoadingImage = styled.img`
  height: 90px;
`

interface LoadingItemsProps {
  /** What is loading, read by screen readers, e.g. "Loading items". */
  label?: string
}

const LoadingItems: React.FC<LoadingItemsProps> = ({ label = 'Loading' }) => {
  return (
    <Container role="status">
      <LoadingImage src={LoadingGif} alt={label} />
    </Container>
  )
}

export default LoadingItems
