import React, { useCallback, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import { useLocation } from "react-router-dom";
import { useToggle } from "react-use";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN } from "consts/chains";
import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";

import { landscapeStyle } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import ConnectWallet from "components/ConnectWallet";
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

  ${landscapeStyle(
    () => css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      position: relative;
    `
  )};
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

const ConnectWalletContainer = styled.div<{ isConnected: boolean; isDefaultChain: boolean }>`
  label {
    color: ${({ theme }) => theme.white};
    cursor: pointer;
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
          <ConnectWalletContainer
            {...{ isConnected, isDefaultChain }}
            onClick={isConnected && isDefaultChain ? toggleIsSettingsOpen : undefined}
          >
            <ConnectWallet />
          </ConnectWalletContainer>
          <Menu {...{ toggleIsHelpOpen, toggleIsSettingsOpen }} />
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
