import React from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import Carousel from './Carousel'

const Container = styled.div`
  color: #fff;
  margin-top: ${responsiveSize(36, 72)};
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

const Title = styled.h1`
  display: flex;
  margin: 0;
  justify-content: center;
  text-align: center;
  flex-wrap: wrap;
`

const SubgraphSection: React.FC = () => {
  return (
    <Container>
      <Title>Supercharge your UX with contract insights!</Title>
      <Carousel />
    </Container>
  )
}
export default SubgraphSection
