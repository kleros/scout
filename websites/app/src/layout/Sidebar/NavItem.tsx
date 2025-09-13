import React from "react";
import styled, { css } from "styled-components";
import { NavLink } from "react-router-dom";
import { hoverShortTransitionTiming } from "styles/commonStyles";

const Item = styled(NavLink)`
  ${hoverShortTransitionTiming};
  display: flex;
  align-items: center;
  height: 48px;
  text-decoration: none;
  color: ${({ theme }) => theme.white}BA;
  padding-left: 16px;
  margin: 0 8px;
  :hover {
    background-color: ${({ theme }) => theme.white}10;
    border-radius: 24px;
  }
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: ${({ theme }) => theme.white}BA;
  }
  &.active {
    color: ${({ theme }) => theme.white};
    svg {
      fill: ${({ theme }) => theme.white};
    }
  }
`;

const Label = styled.span<{ collapsed: boolean }>`
  ${({ collapsed }) =>
    collapsed
      ? css`
          width: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        `
      : css`
          width: auto;
          opacity: 1;
          margin-left: 8px;
          transition: opacity 0.15s ease 250ms;
          white-space: nowrap;
        `}
`;

interface Props {
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}

const NavItem: React.FC<Props> = ({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
}) => (
  <Item to={to} onClick={onClick}>
    <Icon />
    <Label collapsed={collapsed}>{label}</Label>
  </Item>
);

export default NavItem;
