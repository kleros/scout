import React from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import etherscan from 'pngs/projects-using-scout/etherscan.png'
import uniswap from 'pngs/projects-using-scout/uniswap.png'
import ledger from 'pngs/projects-using-scout/ledger.png'
import metamask from 'pngs/projects-using-scout/metamask.png'
import zerion from 'pngs/projects-using-scout/zerion.png'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 36px;
  align-items: center;
  justify-content: center;
  margin-top: ${responsiveSize(48, 100)};
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: auto;
      flex-direction: row;
    `
  )}
`

const Logo = styled.img`
  height: 32px;
`

const StyledText = styled.p`
  font-family: 'Oxanium', sans-serif;
  color: #fff;
  margin: 0;
  font-size: 16px;
`

const LogosContainer = styled.div`
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
`

const logos = [
  { src: etherscan, alt: 'Etherscan' },
  { src: uniswap, alt: 'Uniswap' },
  { src: ledger, alt: 'Ledger' },
  { src: metamask, alt: 'MetaMask' },
  { src: zerion, alt: 'Zerion' },
]

const ProjectsUsingScout = () => {
  return (
    <Container>
      <StyledText>USED BY</StyledText>
      <LogosContainer>
        {logos.map((logo) => (
          <Logo key={logo.alt} src={logo.src} alt={logo.alt} />
        ))}
      </LogosContainer>
      <StyledText>& MANY MORE</StyledText>
    </Container>
  )
}

export default ProjectsUsingScout
