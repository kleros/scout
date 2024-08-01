import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import Hero from './Hero'
import ProjectsUsingScout from 'components/ProjectsUsingScout'
import HowToSubmit from 'components/HowToSubmit'
import SubgraphSection from 'components/SubgraphSection'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${responsiveSize(96, 200)};
  margin-top: ${responsiveSize(36, 80)};
  margin-bottom: ${responsiveSize(80, 160)};
`

const HeroAndProjectsUsingScout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${responsiveSize(48, 100)};
`

const Home = () => {
  return (
    <Container>
      <HeroAndProjectsUsingScout>
        <Hero />
        <ProjectsUsingScout />
      </HeroAndProjectsUsingScout>
      <HowToSubmit
        titleText="How does it work?"
        buttonText="Submit & earn rewards!"
        buttonLink="https://app.klerosscout.eth.limo/"
        showStats={true} 
      />
      <SubgraphSection isForBuildersTab={false} />
    </Container>
  )
}

export default Home
