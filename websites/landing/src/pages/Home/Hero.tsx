import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { SCOUT_APP_URL } from 'consts/urls'
import SecuredByKleros from 'svgs/footer/secured-by-kleros.svg'
import EtherscanAndMetamaskImage from 'pngs/hero/etherscan-and-metamask.png'
import { Button, ButtonAnchor } from 'components/Button'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  color: #fff;
  font-family: 'Oxanium', sans-serif;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: ${responsiveSize(48, 0)};
  width: 84vw;
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

const LeftSide = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  text-align: center;

  ${landscapeStyle(
    () => css`
      width: 560px;
      text-align: left;
    `
  )}
`

const Intro = styled.p`
  display: flex;
  font-size: ${responsiveSize(20, 24)};
  text-align: center;
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      margin: 0;
      margin-bottom: 16px;
    `
  )}
`

const Title = styled.p`
  display: flex;
  margin: 0 auto;
  font-size: ${responsiveSize(48, 64)};
  font-weight: 600;
  font-family: 'Avenir', sans-serif;

  ${landscapeStyle(
    () => css`
      margin: 0;
      margin-bottom: 20px;
    `
  )}
`

const Description = styled.p`
  display: flex;
  font-size: ${responsiveSize(20, 24)};
  margin: 0;
  margin-bottom: ${responsiveSize(32, 60)};

  ${landscapeStyle(
    () => css`
      width: 520px;
    `
  )}
`

const RightSide = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 32px;
  align-items: center;
`

const StyledImg = styled.img`
  height: ${responsiveSize(200, 340)};
`

const StyledButtonAnchor = styled(ButtonAnchor)`
  ${landscapeStyle(
    () => css`
      padding-right: 0;
    `
  )}
`

const StyledSecuredByKleros = styled(SecuredByKleros)`
  align-self: center;

  ${landscapeStyle(
    () => css`
      align-self: flex-start;
    `
  )}
`

const Hero: React.FC = () => {
  return (
    <Container>
      <LeftSide>
        <Intro>Powerful smart contract insights with</Intro>
        <Title>Kleros Scout</Title>
        <Description>
          Kleros Scout pulls contract metadata from Kleros' community curated
          registries to provide insights to the smart contract you are
          interacting with.
        </Description>
        <StyledSecuredByKleros />
      </LeftSide>
      <RightSide>
        <StyledImg src={EtherscanAndMetamaskImage} />
        <StyledButtonAnchor
          href={SCOUT_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Submit & earn rewards!</Button>
        </StyledButtonAnchor>
      </RightSide>
    </Container>
  )
}
export default Hero
