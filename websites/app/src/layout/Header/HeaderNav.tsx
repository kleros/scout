import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import ArrowDown from "svgs/icons/arrow-down.svg";
import { registryNavOptions } from "utils/items";

const Container = styled.div`
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

  &:hover {
    color: ${({ theme }) => theme.white};
  }
`;

const DropdownContainer = styled.div`
  position: relative;
`;

const StyledToggle = styled.div<{ isActive: boolean }>`
  cursor: pointer;
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ isActive, theme }) => (isActive ? theme.white : `${theme.white}BA`)};
  font-weight: ${({ isActive }) => (isActive ? "600" : "normal")};
  padding: 8px 16px;
  border-radius: 7px;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.white};
  }
`;

const StyledArrowDown = styled(ArrowDown)<{ open: boolean }>`
  margin-left: 4px;
  width: 20px;
  height: 12px;
  transition: transform 0.2s;
  transform: rotate(${({ open }) => (open ? "180deg" : "0deg")});
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
  border-radius: 12px;
  min-width: 260px;
  padding: 8px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
`;

const DropdownItem = styled(NavLink)<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ isActive, theme }) => (isActive ? theme.primaryText : `${theme.primaryText}BA`)};
  font-weight: ${({ isActive }) => (isActive ? "600" : "normal")};
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
  const { address: connectedAddress } = useAccount();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRegistriesOpen(false);
      }
    };
    if (registriesOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [registriesOpen]);

  const handleDropdownItemClick = () => {
    setRegistriesOpen(false);
  };

  const registryNames = ['tokens', 'cdn', 'single-tags', 'tags-queries'];
  const pathSegment = location.pathname.split('/')[1];
  const isRegistryActive = registryNames.includes(pathSegment);
  const currentRegistryName = isRegistryActive ? pathSegment : undefined;

  const getRegistryPath = (value: string) => `/${value}`;

  // Check if My Profile should be active
  const isProfilePage = location.pathname.startsWith("/profile");
  const searchParams = new URLSearchParams(location.search);
  const userAddressParam = searchParams.get("address");
  const isMyProfile = isProfilePage && (
    !connectedAddress && !userAddressParam || // Not connected and no param (showing connect prompt)
    (connectedAddress && userAddressParam === connectedAddress.toLowerCase()) // Viewing own profile
  );

  return (
    <Container>
      <StyledNavLink to="/home">Home</StyledNavLink>

      <DropdownContainer ref={dropdownRef}>
        <StyledToggle
          isActive={isRegistryActive}
          onClick={() => setRegistriesOpen(!registriesOpen)}
        >
          Registries
          <StyledArrowDown open={registriesOpen} />
        </StyledToggle>
        {registriesOpen && (
          <DropdownMenu>
            {registryNavOptions.map(({ label, value }) => (
              <DropdownItem
                key={value}
                isActive={currentRegistryName === value}
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
      >
        My Profile
      </StyledLink>

      <StyledNavLink to="/rewards">Active Rewards</StyledNavLink>

      <StyledNavLink to="/guide">Quick Guide</StyledNavLink>
    </Container>
  );
};

export default HeaderNav;
