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

const Logo = styled.img<{ $smaller?: boolean; $bigger?: boolean }>`
  height: ${({ $smaller, $bigger }) => ($smaller ? '20px' : $bigger ? '30px' : '24px')};
  width: auto;
  object-fit: contain;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  ${landscapeStyle(
    () => css`
      height: ${({ $smaller, $bigger }) => ($smaller ? '24px' : $bigger ? '34px' : '28px')};
    `
  )}
`

const StyledText = styled.p`
  font-family: 'Oxanium', sans-serif;
  color: #fff;
  margin: 0;
  font-size: 16px;
`

const LogosContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 24px 48px;
  flex-wrap: wrap;
  justify-content: center;
  flex-shrink: 1;

  ${landscapeStyle(
    () => css`
      gap: 72px;
      flex-wrap: nowrap;
      flex-shrink: 0;
    `
  )}
`

const logos = [
  { src: etherscan, alt: 'Etherscan' },
  { src: blockscout, alt: 'Blockscout', smaller: true },
  { src: otterscan, alt: 'Otterscan' },
  { src: metamask, alt: 'MetaMask', bigger: true },
  { src: ledger, alt: 'Ledger' },
]

const ProjectsUsingScout = () => {
  return (
    <Container>
      <StyledText>USED BY</StyledText>
      <LogosContainer>
        {logos.map((logo) => (
          <Logo
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            $smaller={logo.smaller}
            $bigger={logo.bigger}
          />
        ))}
      </LogosContainer>
      <StyledText>& MANY MORE</StyledText>
    </Container>
  )
}

export default ProjectsUsingScout
