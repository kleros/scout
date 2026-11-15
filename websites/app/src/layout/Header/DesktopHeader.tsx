import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { useLocation } from "react-router-dom";
import { useToggle } from "react-use";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN } from "consts/chains";
import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";

import { BREAKPOINT_HEADER_DESKTOP } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import ConnectWallet from "components/ConnectWallet";
import AccountDisplay from "components/ConnectWallet/AccountDisplay";
import OverlayPortal from "components/OverlayPortal";
import { Overlay } from "components/Overlay";

import Logo from "./Logo";
import HeaderNav from "./HeaderNav";
import DappList from "./navbar/DappList";
import Menu from "./navbar/Menu";
import Help from "./navbar/Menu/Help";
import Settings from "./navbar/Menu/Settings";

const Container = styled.div`
  display: none;
  position: absolute;
  height: 64px;

  @media (min-width: ${BREAKPOINT_HEADER_DESKTOP}px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    position: relative;
  }
`;

const LeftSide = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const CenterSide = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const RightSide = styled.div`
  display: flex;
  gap: ${responsiveSize(4, 8)};

  margin-left: 8px;
  canvas {
    width: 20px;
  }
`;

const ConnectWalletContainer = styled.div`
  label {
    color: ${({ theme }) => theme.white};
    cursor: pointer;
  }
`;

/** The account chip opens the same wallet panel as the gear. */
const AccountButton = styled.button`
  display: flex;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 300px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;

  /* Long ENS names stay on one line and never run into the centred navigation (the full name is in the panel). */
  label {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (min-width: 1400px) {
      max-width: 180px;
    }
  }
`;

const DesktopHeader: React.FC = () => {
  const [isDappListOpen, toggleIsDappListOpen] = useToggle(false);
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);
  const [isSettingsOpen, toggleIsSettingsOpen] = useToggle(false);
  const [initialTab, setInitialTab] = useState<number>(0);
  const location = useLocation();
  const { isConnected, chainId } = useAccount();
  const isDefaultChain = chainId === DEFAULT_CHAIN;
  const initializeFragmentURL = useCallback(() => {
    const hashIncludes = (hash: "#notifications") => location.hash.includes(hash);
    const hasNotificationsPath = hashIncludes("#notifications");
    toggleIsSettingsOpen(hasNotificationsPath);
    setInitialTab(hasNotificationsPath ? 1 : 0);
  }, [
    toggleIsSettingsOpen,
    location.hash,
  ]);

  useEffect(initializeFragmentURL, [initializeFragmentURL]);

  useLockOverlayScroll(isDappListOpen || isHelpOpen || isSettingsOpen);

  return (
    <>
      <Container>
        <LeftSide>
          <Logo />
        </LeftSide>

        <CenterSide>
          <HeaderNav />
        </CenterSide>

        <RightSide>
          <ConnectWalletContainer>
            {isConnected && isDefaultChain ? (
              <AccountButton
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isSettingsOpen}
                onClick={() => toggleIsSettingsOpen()}
              >
                <span className="visually-hidden">Account </span>
                <AccountDisplay />
              </AccountButton>
            ) : (
              <ConnectWallet />
            )}
          </ConnectWalletContainer>
          <Menu {...{ toggleIsHelpOpen, toggleIsSettingsOpen, isHelpOpen, isSettingsOpen }} />
        </RightSide>
      </Container>
      {(isDappListOpen || isHelpOpen || isSettingsOpen) && (
        <OverlayPortal>
          <Overlay>
            {isDappListOpen && <DappList {...{ toggleIsDappListOpen, isDappListOpen }} />}
            {isHelpOpen && <Help {...{ toggleIsHelpOpen, isHelpOpen }} />}
            {isSettingsOpen && <Settings {...{ toggleIsSettingsOpen, isSettingsOpen, initialTab }} />}
          </Overlay>
        </OverlayPortal>
      )}
    </>
  );
};
export default DesktopHeader;
