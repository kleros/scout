import React, { useState } from "react";
import styled from "styled-components";
import { useToggle } from "react-use";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";

import HomeIcon from "svgs/sidebar/home.svg";
import ActivityIcon from "svgs/sidebar/activity.svg";
import RewardsIcon from "svgs/sidebar/rewards.svg";
import BookIcon from "svgs/sidebar/book.svg";
import ArrowDown from "svgs/icons/arrow-down.svg";

import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";

import ConnectWallet from "components/ConnectWallet";
import LightButton from "components/LightButton";
import OverlayPortal from "components/OverlayPortal";
import { Overlay } from "components/Overlay";

import { useOpenContext } from "../MobileHeader";
import DappList from "./DappList";
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

const NavContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RegistriesButton = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 16px;
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background-color: ${({ theme }) => theme.mediumBlue};
  }
`;

const RegistriesIcon = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RegistriesContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const StyledArrowDown = styled(ArrowDown)<{ isExpanded: boolean }>`
  width: 20px;
  height: 12px;
  transition: transform 0.2s;
  transform: rotate(${({ isExpanded }) => (isExpanded ? "180deg" : "0deg")});
  fill: ${({ theme }) => theme.primaryText};
`;

const RegistriesDropdown = styled.div<{ isExpanded: boolean }>`
  display: ${({ isExpanded }) => (isExpanded ? "flex" : "none")};
  flex-direction: column;
  gap: 4px;
  padding-left: 36px;
  margin-top: 4px;
`;

const RegistryItem = styled.div`
  padding: 12px 16px;
  background-color: ${({ theme }) => theme.lightGrey};
  border-radius: 7px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background-color: ${({ theme }) => theme.mediumBlue};
  }
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
  const { isConnected, address: connectedAddress } = useAccount();
  const [isDappListOpen, toggleIsDappListOpen] = useToggle(false);
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);
  const [isSettingsOpen, toggleIsSettingsOpen] = useToggle(false);
  const [isRegistriesExpanded, setIsRegistriesExpanded] = useState(false);
  const { isOpen, toggleIsOpen } = useOpenContext();
  useLockOverlayScroll(isOpen);

  const registryOptions = [
    { label: "Tokens", value: "Tokens" },
    { label: "Contract Domain Name", value: "CDN" },
    { label: "Address Tags - Single Tags", value: "Single_Tags" },
    { label: "Address Tags - Query Tags", value: "Tags_Queries" },
  ];

  const handleRegistryClick = (value: string) => {
    navigate(`/registry?registry=${value}`);
    toggleIsOpen();
  };

  return (
    <>
      <Wrapper {...{ isOpen }}>
        <StyledOverlay>
          <Container {...{ isOpen }}>
            <NavContainer>
              <LightButton
                isMobileNavbar={true}
                text="Home"
                onClick={() => {
                  navigate("/dashboard/home");
                  toggleIsOpen();
                }}
                Icon={HomeIcon}
              />

              <div>
                <RegistriesButton
                  isExpanded={isRegistriesExpanded}
                  onClick={() => setIsRegistriesExpanded(!isRegistriesExpanded)}
                >
                  <RegistriesContent>
                    <RegistriesIcon>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                      </svg>
                    </RegistriesIcon>
                    Registries
                  </RegistriesContent>
                  <StyledArrowDown isExpanded={isRegistriesExpanded} />
                </RegistriesButton>
                <RegistriesDropdown isExpanded={isRegistriesExpanded}>
                  {registryOptions.map(({ label, value }) => (
                    <RegistryItem key={value} onClick={() => handleRegistryClick(value)}>
                      {label}
                    </RegistryItem>
                  ))}
                </RegistriesDropdown>
              </div>

              <LightButton
                isMobileNavbar={true}
                text="My Activity"
                onClick={() => {
                  navigate(`/dashboard/activity/ongoing${
                    connectedAddress ? `?userAddress=${connectedAddress.toLowerCase()}` : ""
                  }`);
                  toggleIsOpen();
                }}
                Icon={ActivityIcon}
              />

              <LightButton
                isMobileNavbar={true}
                text="Active Rewards"
                onClick={() => {
                  navigate("/dashboard/rewards");
                  toggleIsOpen();
                }}
                Icon={RewardsIcon}
              />

              <LightButton
                isMobileNavbar={true}
                text="Quick Guide"
                onClick={() => {
                  navigate("/dashboard/guide");
                  toggleIsOpen();
                }}
                Icon={BookIcon}
              />
            </NavContainer>
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
