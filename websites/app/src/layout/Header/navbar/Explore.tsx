import React, { useMemo, useState, useEffect, useRef } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";

import { Link, useLocation, useSearchParams } from "react-router-dom";

import ArrowDown from "svgs/icons/arrow-down.svg";

import { useOpenContext } from "../MobileHeader";

const Container = styled.div`
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
    `
  )};
`;

const Title = styled.h1`
  display: block;
  margin-bottom: 8px;

  ${landscapeStyle(
    () => css`
      display: none;
    `
  )};
`;

const flexLinkStyle = css<{ isActive: boolean; isMobileNavbar?: boolean }>`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  color: ${({ isActive, theme }) => (isActive ? theme.primaryText : `${theme.primaryText}BA`)};
  font-weight: ${({ isActive, isMobileNavbar }) => (isMobileNavbar && isActive ? "600" : "normal")};

  border-radius: 7px;
  &:hover {
    color: ${({ theme, isMobileNavbar }) => (isMobileNavbar ? theme.primaryText : theme.white)} !important;
  }

  ${landscapeStyle(
    () => css`
      color: ${({ isActive, theme }) => (isActive ? theme.white : `${theme.white}BA`)};
    `
  )};
`;

const StyledLink = styled(Link)<{ isActive: boolean; isMobileNavbar?: boolean }>`
  ${flexLinkStyle};
  padding: 8px 16px 8px 0;
`;

const StyledToggle = styled.div<{ isActive: boolean; isMobileNavbar?: boolean }>`
  cursor: pointer;
  ${flexLinkStyle};
  padding: 8px 8px 8px 0;
`;

const StyledArrowDown = styled(ArrowDown)<{ open: boolean }>`
  margin-left: 4px;
  width: 20px;
  height: 12px;
  transition: transform 0.2s;
  transform: rotate(${({ open }) => (open ? "180deg" : "0deg")});
`;

const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownMenu = styled.div<{ isMobileNavbar?: boolean }>`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: ${({ theme }) => theme.lightBackground};
  border-radius: 12px;
  min-width: 260px;
  padding: 8px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  ${landscapeStyle(
    () => css`
      left: 50%;
      transform: translateX(-50%);
    `
  )};
`;

const DropdownItem = styled(Link)<{ isActive: boolean; isMobileNavbar?: boolean }>`
  ${flexLinkStyle};
  width: 100%;
  padding: 16px 24px;
  white-space: nowrap;
`;

interface IExplore {
  isMobileNavbar?: boolean;
}

const Explore: React.FC<IExplore> = ({ isMobileNavbar }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toggleIsOpen } = useOpenContext();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const navLinks = useMemo(() => [{ to: "/dashboard", text: "Dashboard" }], []);

  const currentSeg = useMemo(() => location.pathname.split("/")[1] || "", [location.pathname]);
  const ownsProfile = !searchParams.get("address");

  const getIsActive = (to: string) => {
    const path = to.split("?")[0];
    if (path === "/") return location.pathname === "/";
    const targetSeg = path.split("/")[1] || "";
    if (targetSeg !== currentSeg) return false;
    return targetSeg !== "profile" || ownsProfile;
  };

  const registryOptions = useMemo(
    () => [
      { label: "Tokens", value: "Tokens" },
      { label: "Contract Domain Name", value: "CDN" },
      { label: "Address Tags - Single Tags", value: "Single_Tags" },
      { label: "Address Tags - Query Tags", value: "Tags_Queries" },
    ],
    []
  );

  const handleOptionClick = () => {
    toggleIsOpen();
    setOpen(false);
  };

  return (
    <Container>
      <Title>Explore</Title>
      {navLinks.map(({ to, text }) => (
        <StyledLink
          key={text}
          onClick={toggleIsOpen}
          isActive={getIsActive(to)}
          {...{ to, isMobileNavbar }}
        >
          {text}
        </StyledLink>
      ))}
      <DropdownContainer ref={dropdownRef}>
        <StyledToggle
          isActive={currentSeg === "registry"}
          isMobileNavbar={isMobileNavbar}
          onClick={() => setOpen(!open)}
        >
          Explore Registries
          <StyledArrowDown open={open} />
        </StyledToggle>
        {open && (
          <DropdownMenu isMobileNavbar={isMobileNavbar}>
            {registryOptions.map(({ label, value }) => (
              <DropdownItem
                key={value}
                isActive={searchParams.get("registry") === value}
                to={`/registry?registry=${value}`}
                isMobileNavbar={isMobileNavbar}
                onClick={handleOptionClick}
              >
                {label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}
      </DropdownContainer>
    </Container>
  );
};

export default Explore;
