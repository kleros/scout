import React from 'react'
import styled, { css } from 'styled-components'
import Section from './Section'
import { Button, ButtonAnchor } from 'components/Button'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import SubmitImage from 'svgs/contribute-and-earn/submit.svg'
import ChallengeImage from 'svgs/contribute-and-earn/challenge.svg'

const Container = styled.div`
  display: flex;
  align-items: center;
  color: #fff;
  flex-direction: column;
  gap: ${responsiveSize(16, 60)};
`

const StyledTitle = styled.h1`
  margin: 0 32px;
  text-align: center;
  font-size: ${responsiveSize(36, 40)};
`

const SectionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${responsiveSize(80, 180)};
  flex-wrap: wrap;
  justify-content: center;
  text-align: center;
  font-family: 'Oxanium', sans-serif;
`

const StyledButtonAnchor = styled(ButtonAnchor)`
  margin-top: 32px;

  ${landscapeStyle(
    () => css`
      padding-right: 0;
      margin-top: 16px;
    `
  )}
`

const ContributeAndEarn: React.FC = () => {
  return (
    <Container>
      <StyledTitle>Contribute & Earn Rewards!</StyledTitle>
      <SectionsContainer>
        <Section
          title="Submit Insights"
          description="Earn up to $20 per successfully submitted insight. 
Scroll down to learn how to submit!"
          image={SubmitImage}
        />
        <Section
          title="Challenge submissions"
          description="Earn up to $40 by policing submissions and challenging invalid ones successfully."
          image={ChallengeImage}
        />
      </SectionsContainer>
      <StyledButtonAnchor
        href="https://app.klerosscout.eth.limo"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button>Contribute & earn rewards!</Button>
      </StyledButtonAnchor>
    </Container>
  )
}

export default ContributeAndEarn
