import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import SecuredByKleros from 'svgs/footer/secured-by-kleros.svg'
import AuditedByVeridise from 'svgs/hero/audited-by-veridise.svg'
import EtherscanAndMetamaskImage from 'pngs/hero/etherscan-and-metamask.png'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  color: #fff;
  font-family: 'Oxanium', sans-serif;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: ${responsiveSize(76, 0)};
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
      width: 600px;
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
    `
  )}
`

const Title = styled.p`
  display: flex;
  margin: 12px auto;
  font-size: ${responsiveSize(48, 64)};
  font-weight: 600;
  font-family: 'Avenir', sans-serif;

  ${landscapeStyle(
    () => css`
      margin: 0;
    `
  )}
`

const Description = styled.p`
  display: flex;
  font-size: ${responsiveSize(20, 24)};
  margin-bottom: 32px;
`

const CreditsContainer = styled.div`
  display: flex;
  height: 60px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: ${responsiveSize(32, 24)};
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      justify-content: flex-start;
    `
  )}
`

const StyledAuditedByVeridise = styled(AuditedByVeridise)`
  display: flex;
  width: 179px;
  height: 28px;
  margin-bottom: 4px;
  transition: height 0.25s;
  &:hover {
    height: 30px;
  }
`

const RightSide = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const StyledImg = styled.img`
  height: ${responsiveSize(200, 380)};
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
        <CreditsContainer>
          <SecuredByKleros />
          <a
            href="https://f8t2x8b2.rocketcdn.me/wp-content/uploads/2023/06/VAR-Kleros-Scout.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            <StyledAuditedByVeridise />
          </a>
        </CreditsContainer>
      </LeftSide>
      <RightSide>
        <StyledImg src={EtherscanAndMetamaskImage} />
      </RightSide>
    </Container>
  )
}
export default Hero
