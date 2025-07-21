import React, { useState, useRef, useEffect } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";
import NavItem from "./NavItem";
import ArrowIcon from "svgs/sidebar/arrow.svg";
import HomeIcon from "svgs/sidebar/home.svg";
import ActivityIcon from "svgs/sidebar/activity.svg";
import RewardsIcon from "svgs/sidebar/rewards.svg";
import BookIcon from "svgs/sidebar/book.svg";

const HEADER_HEIGHT = 64;

const Rail = styled.div`
  display: none;

  ${landscapeStyle(
    () => css`
      display: flex;
      width: 64px;
    `
  )};
`;

const Container = styled.div<{ collapsed: boolean }>`
  display: none;
  position: fixed;
  top: ${HEADER_HEIGHT}px;
  left: 0;
  bottom: 0;
  width: ${({ collapsed }) => (collapsed ? "64px" : "256px")};
  transition: width 0.25s ease;
  flex-direction: column;
  background-color: ${({ theme }) => theme.lightGrey};
  z-index: 1;

  ${landscapeStyle(
    () => css`
      display: flex;
    `
  )};

  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(to bottom, #ffffff29, #ffffff00);
    pointer-events: none;
  }
`;

const Toggle = styled.button<{ collapsed: boolean }>`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  margin: 16px 0 24px;
  transform: ${({ collapsed }) => (collapsed ? "rotate(0deg)" : "rotate(180deg)")};
  svg {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    fill: ${({ theme }) => theme.white}BA;
  }

  :hover svg {
    fill: ${({ theme }) => theme.white};
  }
`;

const NavItems = styled.div`
  display: flex;
  flex-direction: column;
`;

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!collapsed && ref.current && !ref.current.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [collapsed]);

  const handleNavClick = () => setCollapsed(true);

  return (
    <>
      <Rail />
      <Container ref={ref} collapsed={collapsed}>
        <Toggle collapsed={collapsed} onClick={() => setCollapsed(!collapsed)}>
          <ArrowIcon />
        </Toggle>
        <NavItems>
          <NavItem to="/dashboard/home" icon={HomeIcon} label="Home" collapsed={collapsed} onClick={handleNavClick} />
          <NavItem to="/dashboard/activity" icon={ActivityIcon} label="My Activity" collapsed={collapsed} onClick={handleNavClick} />
          <NavItem to="/dashboard/rewards" icon={RewardsIcon} label="Active Rewards" collapsed={collapsed} onClick={handleNavClick} />
          <NavItem to="/dashboard/guide" icon={BookIcon} label="Quick Guide" collapsed={collapsed} onClick={handleNavClick} />
        </NavItems>
      </Container>
    </>
  );
};

export default Sidebar;
