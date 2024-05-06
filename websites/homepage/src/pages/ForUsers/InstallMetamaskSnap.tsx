import React from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import ScoutBackground from 'pngs/scout-background.png'
import MetamaskPopupDarkMode from 'pngs/metamask-popup-dark-mode.png'
import MetamaskLogo from 'tsx:svgs/promo-banner/metamask.svg'
import { Button, ButtonAnchor } from 'components/Button'
// import { installSnap } from 'components/PromoBanner'

const Container = styled.div`
  display: flex;
  background: url(${ScoutBackground}) no-repeat center center;
  height: ${responsiveSize(860, 814)};
  width: 100%;
  background-size: cover;
  color: #fff;
  justify-content: center;
  gap: ${responsiveSize(0, 208)};
  flex-wrap: wrap;
`

const LeftContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${responsiveSize(16, 32)};
  margin-top: ${responsiveSize(20, 40)};
  width: 84vw;
  align-items: center;

  ${landscapeStyle(
    () => css`
      width: auto;
      max-width: 520px;
      align-items: flex-start;
    `
  )}
`

const TitleAndDescription = styled.div`
  display: flex;
  flex-direction: column;
`

const StyledTitle = styled.h1`
  margin: 0;
  font-family: 'Avenir', sans-serif;
  text-align: center;

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
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

const StyledButton = styled(Button)`
  display: flex;
  gap: 10px;
  width: 312px;

  ${landscapeStyle(
    () => css`
      width: 404px;
      margin-top: 8px;
    `
  )}
`

const MetamaskPopup = styled.img`
  max-width: ${responsiveSize(340, 357)};
  max-height: ${responsiveSize(290, 522)};
  margin-top: ${responsiveSize(20, 40)};
`

const InstallMetamaskSnap = () => {
  return (
    <Container>
      <LeftContent>
        <TitleAndDescription>
          <StyledTitle>Install the Kleros Scout Snap</StyledTitle>
          <StyledDescription>
            Install the Kleros Scout Snap on your MetaMask wallet and learn
            crucial information about the smart-contracts you interact with.
          </StyledDescription>
        </TitleAndDescription>
        <StyledButtonAnchor
          href="https://snaps.metamask.io/snap/npm/kleros/scout-snap/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <StyledButton>
            <MetamaskLogo /> Add Kleros Scout to MetaMask
          </StyledButton>
        </StyledButtonAnchor>
      </LeftContent>
      <MetamaskPopup src={MetamaskPopupDarkMode} alt="Metamask Popup" />
    </Container>
  )
}

export default InstallMetamaskSnap
