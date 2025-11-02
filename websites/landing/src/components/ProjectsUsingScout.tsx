import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import etherscan from 'pngs/projects-using-scout/etherscan.png'
import blockscout from 'pngs/projects-using-scout/blockscout.png'
import otterscan from 'pngs/projects-using-scout/otterscan.png'
import ledger from 'pngs/projects-using-scout/ledger.png'
import metamask from 'pngs/projects-using-scout/metamask.png'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 36px;
  align-items: center;
  justify-content: center;
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
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
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
  { src: blockscout, alt: 'Blockscout' },
  { src: otterscan, alt: 'Otterscan' },
  { src: metamask, alt: 'MetaMask' },
  { src: ledger, alt: 'Ledger' },
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
