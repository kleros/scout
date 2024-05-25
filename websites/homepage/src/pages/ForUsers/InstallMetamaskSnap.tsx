import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import ScoutBackground from 'pngs/scout-background.png'
import MetamaskPopupDarkMode from 'pngs/metamask-popup-dark-mode.png'
import MetamaskLogo from 'tsx:svgs/promo-banner/metamask.svg'
import { Button, ButtonAnchor } from 'components/Button'
// import { installSnap } from 'components/PromoBanner'
import Modal from 'react-modal';

Modal.setAppElement(document.body);

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
  const [isConnected, setIsConnected] = useState(false);
  const [snaps, setSnaps] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [address, setAddress] = useState(null);


  const connectToMetaMask = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setIsConnected(true);
      setAddress(accounts[0]);

      console.log('Connected to MetaMask');
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  };

  const checkInstallation = async () => {
    if (!isConnected) {
      await connectToMetaMask();
    }

    try {
      const result = await window.ethereum.request({
        method: 'wallet_getSnaps',
        params: [],
      });
      console.log('Snaps installed:', result);
      setSnaps(result);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error checking snaps installation:', error);
    }
  };
  const handleParticipation = async () => {
    try {
      const response = await fetch('https://galxe-service-6c648393ea39.herokuapp.com/upsertAddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress: address }),
      });
      const data = await response.json();
      setPostResult(data);
    } catch (error) {
      console.error('Error participating in Galxe campaign:', error);
    }
    setIsModalOpen(false);
  };
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
        <StyledButton onClick={checkInstallation}>
          <MetamaskLogo /> Check Installation
        </StyledButton>
        {isConnected ? (
          <div>Connected to MetaMask</div>
        ) : (
          <div>Please connect to MetaMask</div>
        )}
        {Object.keys(snaps).length > 0 ? (
          <div>Snaps installed: {JSON.stringify(snaps)}</div>
        ) : (
          <div>No snaps installed</div>
        )}
      </LeftContent>
      <MetamaskPopup src={MetamaskPopupDarkMode} alt="Metamask Popup" />
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Galxe Campaign Participation"
      >
        <h2>Participate in Galxe Campaign</h2>
        <p>Would you like to participate in the Galxe campaign?</p>
        <button onClick={handleParticipation}>Yes</button>
        <button onClick={() => setIsModalOpen(false)}>No</button>
      </Modal>
    </Container>
  );
}

export default InstallMetamaskSnap
