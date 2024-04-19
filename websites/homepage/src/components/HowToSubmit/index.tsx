import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import Steps from './Steps'
import { Button, ButtonAnchor } from '../Button'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  width: 84vw;
  margin-top: ${responsiveSize(64, 100)};

  ${landscapeStyle(
    () => css`
      width: 84%;
    `
  )}
`

const Title = styled.h1`
  margin: 0;
  margin-bottom: ${responsiveSize(12, 24)};
  font-family: 'Avenir', sans-serif;
  text-align: center;
`

const Description = styled.p`
  margin: 0;
  text-align: center;
  font-family: 'Oxanium', sans-serif;
`

const StyledButtonAnchor = styled(ButtonAnchor)`
  margin-top: ${responsiveSize(12, 52)};

  ${landscapeStyle(
    () => css`
      padding-right: 0;
    `
  )}
`

const Anchor = styled.a`
  color: #cd9dff;
  text-decoration: underline #cd9dff;
`

interface IHowToSubmit {
  titleText: string
  buttonText: string
  buttonLink: string
}

const HowToSubmit: React.FC<IHowToSubmit> = ({
  titleText,
  buttonText,
  buttonLink,
}) => {
  return (
    <Container>
      <Title>{titleText}</Title>
      <Description>
        3 community curated registries contain contract insights which form the
        backbone of Kleros Scout.
        <br />
        They are:{' '}
        <Anchor
          href="https://app.klerosscout.eth.limo/#/?registry=Tokens"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tokens Registry
        </Anchor>
        ,{' '}
        <Anchor
          href="https://app.klerosscout.eth.limo/#/?registry=Tags"
          target="_blank"
          rel="noopener noreferrer"
        >
          Address Tags Registry
        </Anchor>{' '}
        &{' '}
        <Anchor
          href="https://app.klerosscout.eth.limo/#/?registry=CDN"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contract to Domain Name Registry
        </Anchor>
        .
      </Description>
      <Steps />
      <StyledButtonAnchor
        href={buttonLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button>{buttonText}</Button>
      </StyledButtonAnchor>
    </Container>
  )
}
export default HowToSubmit
