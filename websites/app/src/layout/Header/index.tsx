import React from "react";
import styled from "styled-components";

import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  position: sticky;
  z-index: 10;
  top: 0;
  width: 100%;
  background-color: ${({ theme }) => (theme.name === "dark" ? `${theme.lightGrey}` : theme.primaryPurple)};
  backdrop-filter: ${({ theme }) => (theme.name === "dark" ? "blur(12px)" : "none")};
  -webkit-backdrop-filter: ${({ theme }) => (theme.name === "dark" ? "blur(12px)" : "none")}; // Safari support
`;

const HeaderContainer = styled.div`
  width: 100%;
  padding: 0px 24px;
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
