import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import Carousel from './Carousel'

const Container = styled.div`
  color: #fff;
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

const Title = styled.h1<{ isForBuildersTab: boolean }>`
  display: flex;
  margin: 0;
  justify-content: center;
  text-align: center;
  flex-wrap: wrap;
  font-size: ${({ isForBuildersTab }) =>
    isForBuildersTab ? `${responsiveSize(36, 40)}` : '32px'};
`

interface ISubgraphSection {
  isForBuildersTab: boolean
}

const SubgraphSection: React.FC<ISubgraphSection> = ({ isForBuildersTab }) => {
  return (
    <Container>
      <Title isForBuildersTab={isForBuildersTab}>
        Supercharge your UX with contract insights!
      </Title>
      <Carousel />
    </Container>
  )
}
export default SubgraphSection
