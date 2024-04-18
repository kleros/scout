import React from 'react'
import PromoBanner from 'components/PromoBanner'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import SubgraphSection from '../../components/SubgraphSection'
import ProjectsUsingScout from '../Home/ProjectsUsingScout'
import HowToSubmit from 'components/HowToSubmit'
import PoweredBy from './PoweredBy'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${responsiveSize(80, 160)};
  align-items: center;
`

const ForBuilders: React.FC = () => {
  return (
    <Container>
      <PromoBanner />
      <SubgraphSection />
      <ProjectsUsingScout />
      <HowToSubmit
        titleText="How does Community Curation work?"
        buttonText="Get in Touch"
        buttonLink="https://t.me/KlerosCurate"
      />
      <PoweredBy />
    </Container>
  )
}
export default ForBuilders
