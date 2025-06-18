import React, { useState, useRef, useEffect } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";
import NavItem from "./NavItem";
import ArrowIcon from "svgs/sidebar/arrow.svg";
import HomeIcon from "svgs/sidebar/home.svg";
import ActivityIcon from "svgs/sidebar/activity.svg";
import RewardsIcon from "svgs/sidebar/rewards.svg";
import BookIcon from "svgs/sidebar/book.svg";
import PNKIcon from "svgs/sidebar/pnk.svg";

const Container = styled.div<{ collapsed: boolean }>`
  display: none;
  flex-direction: column;
  width: ${({ collapsed }) => (collapsed ? "64px" : "256px")};
  transition: width 0.25s ease;
  background-color: ${({ theme }) => (theme.name === "dark" ? theme.lightGrey : theme.primaryPurple)};
  min-height: 100%;
  position: relative;

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
    background: linear-gradient(to bottom, #FFFFFF29, #FFFFFF00);
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
  transform: ${({ collapsed }) => (collapsed ? "rotate(0deg)" : "rotate(180deg)")};
  margin: 16px 0 24px;

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

const NavItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!collapsed && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [collapsed]);

  return (
    <Container ref={sidebarRef} collapsed={collapsed}>
      <Toggle onClick={() => setCollapsed(!collapsed)} collapsed={collapsed}>
        <ArrowIcon />
      </Toggle>
      <NavItemsContainer>
        <NavItem to="/dashboard/home" icon={HomeIcon} label="Home" collapsed={collapsed} />
        <NavItem to="/dashboard/activity" icon={ActivityIcon} label="My Activity" collapsed={collapsed} />
        <NavItem to="/dashboard/rewards" icon={RewardsIcon} label="Active Rewards" collapsed={collapsed} />
        <NavItem to="/dashboard/guide" icon={BookIcon} label="Quick Guide" collapsed={collapsed} />
        {/* <NavItem to="/dashboard/juror" icon={PNKIcon} label="Earn as a Juror" collapsed={collapsed} /> */}
      </NavItemsContainer>
    </Container>
  );
};

export default Sidebar;
