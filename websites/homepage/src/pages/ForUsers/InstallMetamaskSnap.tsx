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
  height: ${responsiveSize(728, 814)};
  width: 100%;
  background-size: cover;
  color: #fff;
  justify-content: center;
  gap: ${responsiveSize(0, 64)};
  flex-wrap: wrap;
  margin-top: ${responsiveSize(90, 80)};
`

const LeftContent = styled.div`
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
  width: 336px;
`

const MetamaskPopup = styled.img`
  max-width: ${responsiveSize(340, 340)};
  max-height: ${responsiveSize(290, 440)};

  ${landscapeStyle(
    () => css`
      margin-top: 160px;
    `
  )}
`

const InstallMetamaskSnap = () => {
  return (
    <Container>
      <LeftContent>
        <StyledTitle>Install the Kleros Scout Snap</StyledTitle>
        <StyledDescription>
          Install the Kleros Scout Snap on your MetaMask wallet and learn
          crucial information about the smart-contracts you interact with.
        </StyledDescription>
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
