import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import ScoutBackground from 'pngs/scout-background.png'
import MetamaskPopupDarkMode from 'pngs/metamask-popup-dark-mode.png'
import MetamaskLogo from 'svgs/promo-banner/metamask.svg'
import { Button } from 'components/Button'

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
  text-align: center;

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
`

const StyledDescription = styled.p`
  text-align: center;

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
`

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

const installSnap = async () => {
  return await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      'npm:@kleros/scout-snap': { version: '1.4.1' },
    },
  })
}

export const checkInstallation = async ({
  isConnected,
  setIsConnected,
}: {
  isConnected: boolean
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  let connected = isConnected
  if (!connected) {
    try {
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      setIsConnected(true)
      connected = true
    } catch (error) {
      console.error('Error connecting to MetaMask:', error)
      return
    }
  }

  if (!connected) {
    return
  }

  try {
    await installSnap()
  } catch (error) {
    console.error('Error checking snaps installation:', error)
  }
}

const MetamaskPopup = styled.img`
  max-width: ${responsiveSize(340, 357)};
  max-height: ${responsiveSize(290, 522)};
  margin-top: ${responsiveSize(20, 40)};
`

const InstallMetamaskSnap: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false)

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
        <StyledButton
          onClick={() =>
            checkInstallation({
              isConnected,
              setIsConnected,
            })
          }
        >
          <MetamaskLogo /> Add Kleros Scout to Metamask
        </StyledButton>
      </LeftContent>
      <MetamaskPopup src={MetamaskPopupDarkMode} alt="Metamask Popup" />
    </Container>
  )
}

export default InstallMetamaskSnap
