import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { useLocation } from "react-router-dom";
import { useToggle } from "react-use";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN } from "consts/chains";
import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";

import { BREAKPOINT_LANDSCAPE, landscapeStyle } from "styles/landscapeStyle";
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

const Container = styled.div<{ $forceCompact: boolean }>`
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

  ${({ $forceCompact }) =>
    $forceCompact &&
    css`
      @media (min-width: ${BREAKPOINT_LANDSCAPE}px) {
        position: absolute;
        top: 0;
        left: 0;
        width: calc(100% - 48px);
        visibility: hidden;
        pointer-events: none;
      }
    `}
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

interface DesktopHeaderProps {
  forceCompact: boolean;
  onOverflowChange: (overflow: boolean) => void;
}

const ENTER_COMPACT_BUFFER = 32;
const EXIT_COMPACT_BUFFER = 64;

const DesktopHeader: React.FC<DesktopHeaderProps> = ({ forceCompact, onOverflowChange }) => {
  const [isDappListOpen, toggleIsDappListOpen] = useToggle(false);
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);
  const [isSettingsOpen, toggleIsSettingsOpen] = useToggle(false);
  const [initialTab, setInitialTab] = useState<number>(0);
  const location = useLocation();
  const { isConnected, chainId } = useAccount();
  const isDefaultChain = chainId === DEFAULT_CHAIN;

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    const check = () => {
      const c = containerRef.current;
      const l = leftRef.current;
      const n = navRef.current;
      const r = rightRef.current;
      if (!c || !l || !n || !r) return;
      const cWidth = c.clientWidth;
      // Below the landscape breakpoint, container is display:none and width is 0 — skip.
      if (cWidth === 0) return;
      const sum = l.offsetWidth + n.offsetWidth + r.offsetWidth;
      if (forceCompact) {
        if (sum + EXIT_COMPACT_BUFFER < cWidth) onOverflowChange(false);
      } else {
        if (sum + ENTER_COMPACT_BUFFER > cWidth) onOverflowChange(true);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    if (leftRef.current) observer.observe(leftRef.current);
    if (navRef.current) observer.observe(navRef.current);
    if (rightRef.current) observer.observe(rightRef.current);
    return () => observer.disconnect();
  }, [forceCompact, onOverflowChange]);

  return (
    <>
      <Container ref={containerRef} $forceCompact={forceCompact}>
        <LeftSide ref={leftRef}>
          <Logo />
        </LeftSide>

        <CenterSide ref={navRef}>
          <HeaderNav />
        </CenterSide>

        <RightSide ref={rightRef}>
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
