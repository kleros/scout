import React, { useRef } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import MetamaskIcon from 'svgs/promo-banner/metamask.svg'
import { SNAP_DIRECTORY_URL, getMetaMaskProvider, installScoutSnap } from 'utils/snap'

const Container = styled.a`
  display: flex;
  background-color: #0A0A14;
  color: #7186FF;
  width: 100%;
  font-size: 14px;
  align-items: center;
  text-decoration: none;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
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
  const isInstalling = useRef(false)

  // Without MetaMask the link simply opens the Snap's page in the MetaMask Snaps Directory.
  // With MetaMask it asks MetaMask to install the Snap right away.
  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
    if (opensElsewhere || !getMetaMaskProvider()) return
    event.preventDefault()
    if (isInstalling.current) return
    isInstalling.current = true
    const result = await installScoutSnap()
    isInstalling.current = false
    if (result === 'failed') window.open(SNAP_DIRECTORY_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Container href={SNAP_DIRECTORY_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      <MetamaskIcon aria-hidden="true" />
      <StyledP>
        Secure txns on your MetaMask Wallet by installing the{' '}
        <BoldText>Kleros Scout Snap</BoldText>
      </StyledP>
    </Container>
  )
}

export default PromoBanner
