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
  margin-bottom: ${responsiveSize(80, 160)};
  align-items: center;
`

const Home = () => {
  return (
    <Container>
      <Hero />
      <ProjectsUsingScout />
      <HowToSubmit
        titleText="How does it work?"
        buttonText="Submit & earn rewards!"
        buttonLink="https://app.klerosscout.eth.limo/"
      />
      <SubgraphSection />
    </Container>
  )
}

export default Home
