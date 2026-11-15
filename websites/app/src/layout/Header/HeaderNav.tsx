import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import ArrowDown from "svgs/icons/arrow-down.svg";
import { registryNavOptions } from "utils/items";

const REGISTRIES_MENU_ID = "header-registries-menu";

/** "My Profile" is the current page: the profile without an address (not connected), or the connected wallet's own. */
export const isOwnProfilePage = (pathname: string, search: string, connectedAddress?: string) => {
  if (!pathname.startsWith("/profile")) return false;
  const userAddressParam = new URLSearchParams(search).get("address");
  return connectedAddress
    ? userAddressParam === connectedAddress.toLowerCase()
    : !userAddressParam;
};

const Container = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ theme }) => theme.white}BA;
  padding: 8px 16px;
  border-radius: 7px;
  transition: color 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.white};
  }

  &.active {
    color: ${({ theme }) => theme.white};
    font-weight: 600;
  }
`;

const StyledLink = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ $isActive, theme }) => ($isActive ? theme.white : `${theme.white}BA`)};
  font-weight: ${({ $isActive }) => ($isActive ? "600" : "normal")};
  padding: 8px 16px;
  border-radius: 7px;
  transition: color 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.white};
  }
`;

const DropdownContainer = styled.div`
  position: relative;
`;

const StyledToggle = styled.button<{ $isActive: boolean }>`
  cursor: pointer;
  display: flex;
  align-items: center;
  text-decoration: none;
  font-family: inherit;
  font-size: 16px;
  line-height: inherit;
  color: ${({ $isActive, theme }) => ($isActive ? theme.white : `${theme.white}BA`)};
  font-weight: ${({ $isActive }) => ($isActive ? "600" : "normal")};
  background: none;
  border: none;
  margin: 0;
  padding: 8px 16px;
  border-radius: 7px;
  transition: color 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.white};
  }
`;

const StyledArrowDown = styled(ArrowDown)<{ $open: boolean }>`
  margin-left: 4px;
  width: 20px;
  height: 12px;
  transition: transform 0.2s;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  fill: currentColor;
`;

const DropdownMenu = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  min-width: 260px;
  padding: 8px 0;
  box-shadow: ${({ theme }) => theme.shadowTooltip};
  z-index: 1000;
`;

const DropdownItem = styled(NavLink)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ $isActive, theme }) => ($isActive ? theme.primaryText : `${theme.primaryText}BA`)};
  font-weight: ${({ $isActive }) => ($isActive ? "600" : "normal")};
  width: 100%;
  padding: 16px 24px;
  white-space: nowrap;
  border-radius: 7px;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

const HeaderNav: React.FC = () => {
  const [registriesOpen, setRegistriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { address: connectedAddress } = useAccount();
  const location = useLocation();

  useEffect(() => {
    if (!registriesOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRegistriesOpen(false);
      }
    };
    // Escape closes the list and puts focus back on its toggle.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setRegistriesOpen(false);
      if (dropdownRef.current?.contains(document.activeElement)) toggleRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [registriesOpen]);

  // Tabbing out of the list closes it, so it never stays open over the page.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) setRegistriesOpen(false);
  };

  const handleDropdownItemClick = () => {
    setRegistriesOpen(false);
  };

  const registryNames = ['tokens', 'cdn', 'single-tags', 'tags-queries'];
  const pathSegment = location.pathname.split('/')[1];
  const isRegistryActive = registryNames.includes(pathSegment);
  const currentRegistryName = isRegistryActive ? pathSegment : undefined;

  const getRegistryPath = (value: string) => `/${value}`;

  const isMyProfile = isOwnProfilePage(location.pathname, location.search, connectedAddress);

  return (
    <Container aria-label="Main">
      <StyledNavLink to="/home">Home</StyledNavLink>

      <DropdownContainer ref={dropdownRef} onBlur={handleBlur}>
        <StyledToggle
          ref={toggleRef}
          type="button"
          $isActive={isRegistryActive}
          aria-expanded={registriesOpen}
          aria-controls={REGISTRIES_MENU_ID}
          onClick={() => setRegistriesOpen(!registriesOpen)}
        >
          Registries
          <StyledArrowDown $open={registriesOpen} aria-hidden="true" focusable="false" />
        </StyledToggle>
        {registriesOpen && (
          <DropdownMenu id={REGISTRIES_MENU_ID}>
            {registryNavOptions.map(({ label, value }) => (
              <DropdownItem
                key={value}
                $isActive={currentRegistryName === value}
                to={getRegistryPath(value)}
                onClick={handleDropdownItemClick}
              >
                {label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}
      </DropdownContainer>

      <StyledLink
        to={`/profile/pending${
          connectedAddress ? `?address=${connectedAddress.toLowerCase()}` : ""
        }`}
        $isActive={isMyProfile}
        aria-current={isMyProfile ? "page" : undefined}
      >
        My Profile
      </StyledLink>

      <StyledNavLink to="/rewards">Active Rewards</StyledNavLink>

      <StyledNavLink to="/guide">Guide & Skills</StyledNavLink>
    </Container>
  );
};

export default HeaderNav;
