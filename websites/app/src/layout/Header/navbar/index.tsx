import React, { useState } from "react";
import styled from "styled-components";
import { useToggle } from "react-use";
import { Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";

import HomeIcon from "svgs/navbar/home.svg";
import ProfileIcon from "svgs/navbar/activity.svg";
import RewardsIcon from "svgs/navbar/rewards.svg";
import BookIcon from "svgs/navbar/book.svg";
import ArrowDown from "svgs/icons/arrow-down.svg";

import { useLockOverlayScroll } from "hooks/useLockOverlayScroll";
import { registryNavOptions } from "utils/items";

import ConnectWallet from "components/ConnectWallet";
import OverlayPortal from "components/OverlayPortal";
import { Overlay } from "components/Overlay";

import { isOwnProfilePage } from "../HeaderNav";
import { MOBILE_MENU_ID, useOpenContext } from "../MobileHeader";
import DappList from "./DappList";
import Menu from "./Menu";
import Help from "./Menu/Help";
import Settings from "./Menu/Settings";
import { DisconnectWalletButton } from "./Menu/Settings/General";

const MOBILE_REGISTRIES_ID = "mobile-menu-registries";

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

const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Same box as the LightButton rows it replaces (8px padding, 16px icon, 8px gap, 16/24 text), but a real link.
const MenuLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 8px;
  border-radius: 7px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: ${({ theme }) => theme.primaryText};
  transition: 0.1s;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: ${({ theme }) => theme.secondaryText};
  }

  &:hover {
    background-color: ${({ theme }) => theme.whiteLowOpacityStrong};

    svg {
      fill: ${({ theme }) => theme.primaryText};
    }
  }

  &[aria-current="page"] {
    font-weight: 600;

    svg {
      fill: ${({ theme }) => theme.primaryText};
    }
  }
`;

const RegistriesButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: 8px;
  border: none;
  border-radius: 7px;
  background: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
  line-height: 24px;
  color: ${({ theme }) => theme.primaryText};
  text-align: left;

  &:hover {
    background-color: ${({ theme }) => theme.whiteLowOpacityStrong};
  }
`;

const RegistriesContent = styled.span<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  font-weight: ${({ $isActive }) => ($isActive ? 600 : 400)};

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: ${({ $isActive, theme }) => ($isActive ? theme.primaryText : theme.secondaryText)};
  }
`;

const StyledArrowDown = styled(ArrowDown)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 12px;
  transition: transform 0.2s;
  transform: rotate(${({ $isExpanded }) => ($isExpanded ? "180deg" : "0deg")});
  fill: ${({ theme }) => theme.primaryText};
`;

const RegistriesDropdown = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  flex-direction: column;
  gap: 4px;
  padding-left: 36px;
  margin-top: 4px;
`;

const RegistryItem = styled(Link)`
  padding: 12px 16px;
  background-color: ${({ theme }) => theme.lightGrey};
  border-radius: 7px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background-color: ${({ theme }) => theme.whiteLowOpacityStrong};
  }

  &[aria-current="page"] {
    font-weight: 600;
  }
`;

export interface ISettings {
  toggleIsSettingsOpen: (value?: boolean) => void;
  initialTab?: number;
}

export interface IHelp {
  toggleIsHelpOpen: (value?: boolean) => void;
}

export interface IDappList {
  toggleIsDappListOpen: () => void;
}

const NavBar: React.FC = () => {
  const { pathname, search } = useLocation();
  const { isConnected, address: connectedAddress } = useAccount();
  const [isDappListOpen, toggleIsDappListOpen] = useToggle(false);
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);
  const [isSettingsOpen, toggleIsSettingsOpen] = useToggle(false);
  const [isRegistriesExpanded, setIsRegistriesExpanded] = useState(false);
  const { isOpen, close } = useOpenContext();
  useLockOverlayScroll(isOpen);

  // The current page is marked as on the desktop navigation.
  const currentIf = (active: boolean) => (active ? ("page" as const) : undefined);
  const currentRegistry = registryNavOptions.find(({ value }) => pathname.split("/")[1] === value)?.value;
  const profilePath = `/profile/pending${connectedAddress ? `?address=${connectedAddress.toLowerCase()}` : ""}`;

  return (
    <>
      <Wrapper {...{ isOpen }}>
        {/* Tapping the dimmed page below the menu closes it. */}
        <StyledOverlay
          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <Container id={MOBILE_MENU_ID} {...{ isOpen }}>
            <NavContainer aria-label="Main">
              <MenuLink to="/home" onClick={close} aria-current={currentIf(pathname === "/home")}>
                <HomeIcon />
                Home
              </MenuLink>

              <div>
                <RegistriesButton
                  type="button"
                  aria-expanded={isRegistriesExpanded}
                  aria-controls={MOBILE_REGISTRIES_ID}
                  onClick={() => setIsRegistriesExpanded(!isRegistriesExpanded)}
                >
                  <RegistriesContent $isActive={!!currentRegistry}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                    </svg>
                    Registries
                  </RegistriesContent>
                  <StyledArrowDown $isExpanded={isRegistriesExpanded} aria-hidden="true" focusable="false" />
                </RegistriesButton>
                <RegistriesDropdown id={MOBILE_REGISTRIES_ID} $isExpanded={isRegistriesExpanded}>
                  {registryNavOptions.map(({ label, value }) => (
                    <RegistryItem
                      key={value}
                      to={`/${value}`}
                      onClick={close}
                      aria-current={currentIf(currentRegistry === value)}
                    >
                      {label}
                    </RegistryItem>
                  ))}
                </RegistriesDropdown>
              </div>

              <MenuLink
                to={profilePath}
                onClick={close}
                aria-current={currentIf(isOwnProfilePage(pathname, search, connectedAddress))}
              >
                <ProfileIcon />
                My Profile
              </MenuLink>

              <MenuLink to="/rewards" onClick={close} aria-current={currentIf(pathname.startsWith("/rewards"))}>
                <RewardsIcon />
                Active Rewards
              </MenuLink>

              <MenuLink to="/guide" onClick={close} aria-current={currentIf(pathname.startsWith("/guide"))}>
                <BookIcon />
                Guide & Skills
              </MenuLink>
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
            <Menu {...{ toggleIsHelpOpen, toggleIsSettingsOpen, isHelpOpen, isSettingsOpen }} isMobileNavbar={true} />
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
