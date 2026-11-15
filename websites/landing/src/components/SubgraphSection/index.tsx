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

// On For Builders this is the page's first and main heading; on Home it is a section of the page.
const SubgraphSection: React.FC<ISubgraphSection> = ({ isForBuildersTab }) => {
  return (
    <Container>
      <Title isForBuildersTab={isForBuildersTab} as={isForBuildersTab ? 'h1' : 'h2'}>
        Supercharge your UX with contract insights!
      </Title>
      <Carousel titleAs={isForBuildersTab ? 'h2' : 'h3'} />
    </Container>
  )
}
export default SubgraphSection
