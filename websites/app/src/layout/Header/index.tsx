import React from "react";
import styled, { css } from "styled-components";

import { MAX_WIDTH_LANDSCAPE, landscapeStyle } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

// z-index 40: above page content (form fields use up to 10 and 100 inside their own z-index 1 context),
// below the dimmed overlays and modals (30 portalled to body at 9999, ModalComponents at 50, confirmation at 1000).
const Container = styled.header`
  display: flex;
  flex-wrap: wrap;
  position: sticky;
  z-index: 40;
  top: 0;
  width: 100%;
  background-color: ${({ theme }) => (theme.name === "dark" ? `${theme.lightGrey}` : theme.primaryPurple)};
  backdrop-filter: ${({ theme }) => (theme.name === "dark" ? "blur(12px)" : "none")};
  -webkit-backdrop-filter: ${({ theme }) => (theme.name === "dark" ? "blur(12px)" : "none")}; // Safari support
  border-bottom: 1px solid ${({ theme }) => theme.white}29;

  /* The page keeps 80px of scroll-padding so focused content clears this bar. The bar's own controls are always
     on screen: without this, tabbing back into the header while scrolled would jump the page up. */
  a,
  button {
    scroll-margin-top: -80px;
  }

  /* The phone menu panel scrolls on its own; its entries keep the normal behaviour. */
  #mobile-menu a,
  #mobile-menu button {
    scroll-margin-top: 0;
  }
`;

const HeaderContainer = styled.div`
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  padding: 0 16px;

  ${landscapeStyle(
    () => css`
      padding: 0 ${responsiveSize(0, 48)};
    `
  )}
`;

const Header: React.FC = () => {
  return (
    <Container>
      <HeaderContainer>
        <DesktopHeader />
        <MobileHeader />
      </HeaderContainer>
    </Container>
  );
};

export default Header;
