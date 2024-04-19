import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import ContributeAndEarn from './ContributeAndEarn'
import HowToSubmit from 'components/HowToSubmit'
import InstallMetamaskSnap from './InstallMetamaskSnap'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${responsiveSize(80, 160)};
  align-items: center;
`

const index: React.FC = () => {
  return (
    <Container>
      <ContributeAndEarn />
      <HowToSubmit
        titleText="How do I Submit?"
        buttonText="Start submitting & earn rewards!"
        buttonLink="https://app.klerosscout.eth.limo/"
      />
      <InstallMetamaskSnap />
    </Container>
  )
}
export default index
