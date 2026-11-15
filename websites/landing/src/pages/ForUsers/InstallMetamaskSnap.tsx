import React, { useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import ScoutBackground from 'pngs/scout-background.jpg'
import MetamaskPopupDarkMode from 'pngs/metamask-popup-dark-mode.webp'
import MetamaskLogo from 'svgs/promo-banner/metamask.svg'
import { Button } from 'components/Button'
import {
  METAMASK_DOWNLOAD_URL,
  SNAP_DIRECTORY_URL,
  SnapInstallResult,
  installScoutSnap,
} from 'utils/snap'

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

const StyledTitle = styled.h2`
  font-size: 2em;
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

const Status = styled.div`
  max-width: 404px;
  font-size: 16px;
  line-height: 1.5;
  text-align: center;

  &:empty {
    margin-top: ${responsiveSize(-16, -32)};
  }

  ${landscapeStyle(
    () => css`
      text-align: start;
    `
  )}
`

const StatusLink = styled.a`
  color: #8A9EFF;
  text-decoration: underline;
`

const MetamaskPopup = styled.img`
  max-width: ${responsiveSize(340, 357)};
  max-height: ${responsiveSize(290, 522)};
  margin-top: ${responsiveSize(20, 40)};
`

const SnapPageLink: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusLink href={SNAP_DIRECTORY_URL} target="_blank" rel="noopener noreferrer">
    {children}
  </StatusLink>
)

type StatusKind = SnapInstallResult | 'waiting'

const statusMessage = (status: StatusKind | undefined) => {
  switch (status) {
    case 'waiting':
      return 'Confirm the installation in MetaMask.'
    case 'installed':
      return 'The Kleros Scout Snap is installed. You will see its insights in MetaMask when you confirm a transaction.'
    case 'pending':
      return 'MetaMask already has a request from this site open. Finish it in MetaMask, then try again.'
    case 'no-metamask':
      return (
        <>
          MetaMask was not found in this browser. Snaps need the MetaMask browser extension:{' '}
          <StatusLink href={METAMASK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
            get MetaMask
          </StatusLink>
          , then add the Snap from its <SnapPageLink>page in the MetaMask Snaps Directory</SnapPageLink>.
        </>
      )
    case 'failed':
      return (
        <>
          Your wallet could not install the Snap. Snaps need the MetaMask browser extension, version 11
          or later. You can also add it from its{' '}
          <SnapPageLink>page in the MetaMask Snaps Directory</SnapPageLink>.
        </>
      )
    default:
      // Declined in MetaMask ('rejected'): nothing to say.
      return null
  }
}

const InstallMetamaskSnap: React.FC = () => {
  const [status, setStatus] = useState<StatusKind>()
  const isInstalling = useRef(false)

  const handleInstall = async () => {
    if (isInstalling.current) return
    isInstalling.current = true
    setStatus('waiting')
    const result = await installScoutSnap()
    isInstalling.current = false
    setStatus(result)
  }

  return (
    <Container>
      <LeftContent>
        <TitleAndDescription>
          <StyledTitle>Install the Kleros Scout Snap</StyledTitle>
          <StyledDescription>
            Install the Kleros Scout Snap on your MetaMask wallet and learn
            crucial information about the smart contracts you interact with.
          </StyledDescription>
        </TitleAndDescription>
        <StyledButton type="button" onClick={handleInstall}>
          <MetamaskLogo aria-hidden="true" /> Add Kleros Scout to MetaMask
        </StyledButton>
        <Status role="status">{statusMessage(status)}</Status>
      </LeftContent>
      <MetamaskPopup
        src={MetamaskPopupDarkMode}
        alt="MetaMask transaction popup with a Kleros Scout tab showing contract insights"
      />
    </Container>
  )
}

export default InstallMetamaskSnap
