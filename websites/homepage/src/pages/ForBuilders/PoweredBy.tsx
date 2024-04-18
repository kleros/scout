import React from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import CurateBackground from 'pngs/curate-background.png'
import { Button, ButtonAnchor } from 'components/Button'

const Container = styled.div`
  display: flex;
  background: url(${CurateBackground}) no-repeat center center;
  height: ${responsiveSize(520, 600)};
  width: 100%;
  background-size: cover;
  color: #fff;
  justify-content: center;
  gap: ${responsiveSize(0, 64)};
  flex-wrap: wrap;
  margin-top: ${responsiveSize(90, 80)};
`

const InnerContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${responsiveSize(16, 32)};
  margin-top: ${responsiveSize(60, 160)};
  width: 84vw;
  align-items: center;

  ${landscapeStyle(
    () => css`
      width: auto;
      max-width: 440px;
      align-items: flex-start;
    `
  )}
`

const StyledTitle = styled.h1`
  margin: 0;
  font-family: 'Avenir', sans-serif;
  text-align: center;
  height: auto;

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
`

const DescriptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const StyledDescription = styled.p`
  font-family: 'Oxanium', sans-serif;
  text-align: center;

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
`

const StyledButtonAnchor = styled(ButtonAnchor)``

const PoweredBy = () => {
  return (
    <Container>
      <InnerContent>
        <StyledTitle>Powered by Kleros Curate</StyledTitle>
        <DescriptionsContainer>
          <StyledDescription>
            Kleros Curate harnesses game theory and blockchain to power
            decentralised curation of ANYTHING.
          </StyledDescription>
          <StyledDescription>
            Contract metadata, content or profile tagging on social platforms,
            whitelisting validators - it’s a one-stop solution for unbiased,
            community driven and censorship free whitelisting/blacklisting based
            on conditions.
          </StyledDescription>
        </DescriptionsContainer>
        <StyledButtonAnchor
          href="https://t.me/KlerosCurate"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Get in Touch</Button>
        </StyledButtonAnchor>
      </InnerContent>
    </Container>
  )
}

export default PoweredBy
