import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { SCOUT_APP_URL } from 'consts/urls'
import ContributeAndEarn from './ContributeAndEarn'
import HowToSubmit from 'components/HowToSubmit'
import InstallMetamaskSnap from './InstallMetamaskSnap'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${responsiveSize(96, 200)};
  margin-top: ${responsiveSize(36, 80)};
  margin-bottom: ${responsiveSize(80, 160)};
`

const index: React.FC = () => {
  return (
    <Container>
      <ContributeAndEarn />
      <HowToSubmit
        titleText="How do I Submit?"
        buttonText="Start submitting & earn rewards!"
        buttonLink={SCOUT_APP_URL}
        showStats={true}
      />
      <InstallMetamaskSnap />
    </Container>
  )
}
export default index
