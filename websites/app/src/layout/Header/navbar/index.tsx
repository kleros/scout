import React from "react";
import styled from "styled-components";
import { useToggle } from "react-use";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";

import KlerosSolutionsIcon from "svgs/menu-icons/kleros-solutions.svg";
import HomeIcon from "svgs/sidebar/home.svg";
import ActivityIcon from "svgs/sidebar/activity.svg";
import RewardsIcon from "svgs/sidebar/rewards.svg";
import BookIcon from "svgs/sidebar/book.svg";

import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";

import ConnectWallet from "components/ConnectWallet";
import LightButton from "components/LightButton";
import OverlayPortal from "components/OverlayPortal";
import { Overlay } from "components/Overlay";

import { useOpenContext } from "../MobileHeader";
import DappList from "./DappList";
import Explore from "./Explore";
import Menu from "./Menu";
import Help from "./Menu/Help";
import Settings from "./Menu/Settings";
import { DisconnectWalletButton } from "./Menu/Settings/General";

const Wrapper = styled.div<{ isOpen: boolean; }>`
  visibility: ${({ isOpen }) => (isOpen ? "visible" : "hidden")};
  position: absolute;
  top: 100%;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
`;

const StyledOverlay = styled(Overlay)`
  top: unset;
`;

const Container = styled.div<{ isOpen: boolean; }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  z-index: 1;
  background-color: ${({ theme }) => theme.whiteBackground};
  box-shadow: 0px 2px 3px ${({ theme }) => theme.defaultShadow};
  transform-origin: top;
  transform: scaleY(${({ isOpen }) => (isOpen ? "1" : "0")});
  visibility: ${({ isOpen }) => (isOpen ? "visible" : "hidden")};
  transition-property: transform, visibility;
  transition-duration: ${({ theme }) => theme.transitionSpeed};
  transition-timing-function: ease;
  padding: 24px;

  hr {
    margin: 24px 0;
  }
`;

const WalletContainer = styled.div`
  display: flex;
  gap: 16px;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const DisconnectWalletButtonContainer = styled.div`
  display: flex;
  align-items: center;
`;

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export interface ISettings {
  toggleIsSettingsOpen: () => void;
  initialTab?: number;
}

export interface IHelp {
  toggleIsHelpOpen: () => void;
}

export interface IDappList {
  toggleIsDappListOpen: () => void;
}

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [isDappListOpen, toggleIsDappListOpen] = useToggle(false);
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);
  const [isSettingsOpen, toggleIsSettingsOpen] = useToggle(false);
  const { isOpen, toggleIsOpen } = useOpenContext();
  useLockOverlayScroll(isOpen);

  return (
    <>
      <Wrapper {...{ isOpen }}>
        <StyledOverlay>
          <Container {...{ isOpen }}>
            <LightButton
              isMobileNavbar={true}
              text="Kleros Solutions"
              onClick={() => {
                toggleIsDappListOpen();
              }}
              Icon={KlerosSolutionsIcon}
            />
            <hr />
            <Explore isMobileNavbar={true} />
            <hr />
            <SidebarContainer>
              <LightButton
                isMobileNavbar={true}
                text="Home"
                onClick={() => {
                  navigate("/dashboard/home")
                  toggleIsOpen();
                }}
                Icon={HomeIcon}
              />
              <LightButton
                isMobileNavbar={true}
                text="My Activity"
                onClick={() => {
                  navigate("/dashboard/activity")
                  toggleIsOpen();
                }}
                Icon={ActivityIcon}
              />
              <LightButton
                isMobileNavbar={true}
                text="Active Rewards"
                onClick={() => {
                  navigate("/dashboard/rewards")
                  toggleIsOpen();
                }}
                Icon={RewardsIcon}
              />
              <LightButton
                isMobileNavbar={true}
                text="Quick Guide"
                onClick={() => {
                  navigate("/dashboard/guide")
                  toggleIsOpen();
                }}
                Icon={BookIcon}
              />
            </SidebarContainer>
            <hr />
            <WalletContainer>
              <ConnectWallet />
              {isConnected && (
                <DisconnectWalletButtonContainer>
                  <DisconnectWalletButton />
                </DisconnectWalletButtonContainer>
              )}
            </WalletContainer>
            <hr />
            <Menu {...{ toggleIsHelpOpen, toggleIsSettingsOpen }} isMobileNavbar={true} />
            <br />
          </Container>
        </StyledOverlay>
      </Wrapper>
      {(isDappListOpen || isHelpOpen || isSettingsOpen) && (
        <OverlayPortal>
          <Overlay>
            {isDappListOpen && <DappList {...{ toggleIsDappListOpen }} />}
            {isHelpOpen && <Help {...{ toggleIsHelpOpen }} />}
            {isSettingsOpen && <Settings {...{ toggleIsSettingsOpen }} />}
          </Overlay>
        </OverlayPortal>
      )}
    </>
  );
};

export default NavBar;
