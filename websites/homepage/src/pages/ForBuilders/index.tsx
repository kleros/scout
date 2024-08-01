import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import SubgraphSection from 'components/SubgraphSection'
import ProjectsUsingScout from 'components/ProjectsUsingScout'
import HowToSubmit from 'components/HowToSubmit'
import PoweredBy from './PoweredBy'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${responsiveSize(96, 200)};
  margin-top: ${responsiveSize(36, 80)};
  margin-bottom: ${responsiveSize(80, 160)};
`

const SubgraphSectionAndProjectsUsingScout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${responsiveSize(48, 100)};
`

const ForBuilders: React.FC = () => {
  return (
    <Container>
      <SubgraphSectionAndProjectsUsingScout>
        <SubgraphSection isForBuildersTab={true} />
        <ProjectsUsingScout />
      </SubgraphSectionAndProjectsUsingScout>
      <HowToSubmit
        titleText="How does Community Curation work?"
        buttonText="Get in Touch"
        buttonLink="https://t.me/KlerosCurate"
        showStats={false} 
      />
      <PoweredBy />
    </Container>
  )
}
export default ForBuilders
