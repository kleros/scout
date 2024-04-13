import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import Hero from './Hero'
import ProjectsUsingScout from './ProjectsUsingScout'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: ${responsiveSize(36, 80)};
  margin-bottom: ${responsiveSize(80, 160)};
  align-items: center;
`

const Home = () => {
  return (
    <Container>
      <Hero />
      <ProjectsUsingScout />
    </Container>
  )
}

export default Home
