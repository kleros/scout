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

const Box = styled.div`
  width: 100%;
  max-width: 1110px;
  border: 2px solid #3A3A3A;
  border-radius: 16px;
  padding: 50px 0px;
  margin: 0px;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;

  ${landscapeStyle(
  () => css`
      height: 184px;
      margin: 50px 0px;
      padding: 0px;
    `
)}
`

const StatsContainer = styled.div`
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
padding: 0px;
width: 148px;
`

const StatsTitle = styled.h1`
  margin: 0;
  margin-bottom: ${responsiveSize(12, 24)};
  font-family: 'Avenir', sans-serif;
  text-align: center;
  font-style: normal;
  font-weight: 800;
  color: #9C46FF;
`

const StatsDescription = styled.p`
  margin: 0;
  text-align: center;
  font-family: 'Oxanium', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: 0.08em;
`

const StyledButtonAnchor = styled(ButtonAnchor)<{ showStats: boolean }>`
  margin-top: ${({ showStats }) =>
    showStats ? responsiveSize(24, 0) : responsiveSize(24, 48)};

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
  showStats: boolean
}

const HowToSubmit: React.FC<IHowToSubmit> = ({
  titleText,
  buttonText,
  buttonLink,
  showStats = false,
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
      {showStats && (
        <Box>
          <StatsContainer>
            <StatsTitle>$8000</StatsTitle>
            <StatsDescription>MONTHLY REWARD POOL</StatsDescription>
          </StatsContainer>
          <StatsContainer>
            <StatsTitle>618</StatsTitle>
            <StatsDescription>AVG. MONTHLY SUBMISSIONS</StatsDescription>
          </StatsContainer>
          <StatsContainer>
            <StatsTitle>$15</StatsTitle>
            <StatsDescription>AVG. REWARD PER SUBMISSION</StatsDescription>
          </StatsContainer>
          <StatsContainer>
            <StatsTitle>$40</StatsTitle>
            <StatsDescription>AVG. REWARD PER CHALLENGE</StatsDescription>
          </StatsContainer>
        </Box>
      )}
      <StyledButtonAnchor
        {...{ showStats }}
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
