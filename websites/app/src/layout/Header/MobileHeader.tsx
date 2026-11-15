import React, { useCallback, useContext, useEffect, useMemo } from "react";
import styled from "styled-components";

import { useLocation } from "react-router-dom";
import { useToggle } from "react-use";

import HamburgerIcon from "svgs/header/hamburger.svg";

import { useDialog } from "hooks/useDialog";

import { BREAKPOINT_HEADER_DESKTOP } from "styles/landscapeStyle";

import LightButton from "components/LightButton";

import Logo from "./Logo";
import NavBar from "./navbar";

export const MOBILE_MENU_ID = "mobile-menu";

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 64px;

  @media (min-width: ${BREAKPOINT_HEADER_DESKTOP}px) {
    display: none;
  }
`;

// Not positioned: the menu panel inside is placed against the header.
const MenuArea = styled.div`
  display: flex;
  align-items: center;
`;

// 40x40 target; the negative margin keeps the 16px glyph on the header's right edge.
const StyledLightButton = styled(LightButton)`
  padding: 12px !important;
  margin-right: -12px;

  .button-svg {
    margin-right: 0px;
  }

  /* Touch screens keep :hover after a tap; no lingering square there. */
  @media (hover: none) {
    &:hover {
      background-color: transparent;
    }
  }
`;

const OpenContext = React.createContext({
  isOpen: false,
  toggleIsOpen: () => {
    // Placeholder
  },
  close: () => {
    // Placeholder
  },
});

export function useOpenContext() {
  return useContext(OpenContext);
}

const MobileHeader = () => {
  const [isOpen, toggleIsOpen] = useToggle(false);
  const close = useCallback(() => toggleIsOpen(false), [toggleIsOpen]);
  const { pathname } = useLocation();

  // The hamburger and the menu form the dialog: focus stays among them, Escape closes the menu and returns
  // focus to the hamburger.
  const { ref: menuAreaRef, dialogProps } = useDialog(isOpen, close);

  // Any navigation (a menu entry, the logo, Back) closes the menu.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // The menu only exists below the desktop breakpoint: widening the window (or turning a tablet) closes it,
  // which also releases its scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const query = window.matchMedia(`(min-width: ${BREAKPOINT_HEADER_DESKTOP}px)`);
    const onChange = () => {
      if (query.matches) close();
    };
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [isOpen, close]);

  const memoizedContext = useMemo(() => ({ isOpen, toggleIsOpen, close }), [isOpen, toggleIsOpen, close]);
  return (
    <Container>
      <OpenContext.Provider value={memoizedContext}>
        <Logo />
        <MenuArea {...(isOpen ? { ...dialogProps, "aria-label": "Menu" } : { ref: menuAreaRef })}>
          <StyledLightButton
            text=""
            Icon={HamburgerIcon}
            onPress={toggleIsOpen}
            aria-label="Menu"
            aria-expanded={isOpen}
            aria-controls={MOBILE_MENU_ID}
          />
          <NavBar />
        </MenuArea>
      </OpenContext.Provider>
    </Container>
  );
};
export default MobileHeader;
