import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import ScoutBackground from 'pngs/scout-background.png'
import MetamaskPopupDarkMode from 'pngs/metamask-popup-dark-mode.png'
import MetamaskLogo from 'svgs/promo-banner/metamask.svg'
import GalxeIcon from 'svgs/promo-banner/galxe.svg'
import { Button } from 'components/Button'
import GalxeModal, { handleAnchorClick } from 'components/GalxeModal'

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

const StyledAnchor = styled.a`
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-family: 'Avenir', sans-serif;
  color: #fff;
  text-decoration: underline;
  flex-wrap: wrap;
  text-align: center;
  justify-content: center;
  width: 100%;

  &:hover {
    color: #ccc;
  }

  ${landscapeStyle(
    () => css`
      justify-content: flex-start;
    `
  )}
`

const GalxeIconStyled = styled(GalxeIcon)`
  display: flex;
  margin-bottom: ${responsiveSize(8, 0)};
  margin-right: 8px;
  align-items: center;
  justify-content: center;
`

const connectToMetaMask = async (
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setAddress: React.Dispatch<React.SetStateAction<string | null>>
) => {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })
    setIsConnected(true)
    setAddress(accounts[0])
  } catch (error) {
    console.error('Error connecting to MetaMask:', error)
  }
}

const installSnap = async () => {
  return await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      'npm:@kleros/scout-snap': { version: '1.3.1' },
    },
  })
}

export const checkInstallation = async ({
  isConnected,
  setIsConnected,
  address,
  setAddress,
  setIsModalOpen,
}: {
  isConnected: boolean
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>
  address: string | null
  setAddress: React.Dispatch<React.SetStateAction<string | null>>
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  let connected = isConnected
  if (!connected) {
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      setIsConnected(true)
      setAddress(accounts[0])
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
    setIsModalOpen(true)
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

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
              address,
              setAddress,
              setIsModalOpen,
            })
          }
        >
          <MetamaskLogo /> Add Kleros Scout to Metamask
        </StyledButton>
        <StyledAnchor
          href="https://app.galxe.com/quest/kleros/GCYsVtdurQ"
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => handleAnchorClick(e, address, setIsModalOpen)}
        >
          <GalxeIconStyled />
          Claim your Galxe NFT if you’ve already installed!
        </StyledAnchor>
      </LeftContent>
      <MetamaskPopup src={MetamaskPopupDarkMode} alt="Metamask Popup" />
      <GalxeModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        address={address}
      />
    </Container>
  )
}

export default InstallMetamaskSnap
