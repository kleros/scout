import React from 'react'
import styled from 'styled-components'
import LoadingGif from 'gifs/loading-icosahedron.gif'

const Container = styled.div`
  display: flex;
`

const LoadingImage = styled.img`
  height: 104px;
`

const LoadingItems: React.FC = () => {
  return (
    <Container>
      <LoadingImage src={LoadingGif} />
    </Container>
  )
}

export default LoadingItems
