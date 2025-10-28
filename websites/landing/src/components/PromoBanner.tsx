import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import MetamaskIcon from 'svgs/promo-banner/metamask.svg'
import GalxeIcon from 'svgs/promo-banner/galxe.svg'
import { checkInstallation } from 'pages/ForUsers/InstallMetamaskSnap'
import GalxeModal from 'components/GalxeModal'

const Container = styled.a`
  display: flex;
  background-color: #0A0A14;
  color: #7186FF;
  width: 100%;
  font-size: 14px;
  align-items: center;
  text-decoration: none;
  justify-content: center;
  font-family: 'Avenir', sans-serif;
  gap: 8px 0;
  flex-wrap: wrap;
  padding: 8px 0;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: #0D0D1A;
    color: #8A9EFF;
  }
`

const StyledP = styled.p`
  margin: 0 24px;
  font-size: 14px;

  ${landscapeStyle(
    () =>
      css`
        margin: 0 8px;
      `
  )}
`

const BoldText = styled.span`
  font-weight: 600;
`

const PromoBanner: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  return (
    <>
      <Container
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
        <MetamaskIcon />
        <StyledP>
          Secure txns on your MetaMask Wallet and claim{' '}
          <BoldText>Galxe points</BoldText> by installing the Kleros Scout Snap
        </StyledP>
        <GalxeIcon />
      </Container>
      <GalxeModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        address={address}
      />
    </>
  )
}

export default PromoBanner
