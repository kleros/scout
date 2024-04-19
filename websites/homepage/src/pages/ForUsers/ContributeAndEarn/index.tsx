import React from 'react'
import styled, { css } from 'styled-components'
import Section from './Section'
import { Button, ButtonAnchor } from '~src/components/Button'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'

const Container = styled.div`
  display: flex;
  align-items: center;
  color: #fff;
  flex-direction: column;
  gap: ${responsiveSize(24, 60)};
  margin-top: ${responsiveSize(36, 72)};
`

const StyledTitle = styled.h1`
  margin: 0;
  text-align: center;
  font-size: 40px;
`

const SectionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${responsiveSize(40, 180)};
  flex-wrap: wrap;
  justify-content: center;
  text-align: center;
`

const StyledButtonAnchor = styled(ButtonAnchor)`
  ${landscapeStyle(
    () => css`
      padding-right: 0;
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
        />
        <Section
          title="Challenge submissions"
          description="Earn up to $40 by policing submissions and challenging invalid ones successfully."
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
