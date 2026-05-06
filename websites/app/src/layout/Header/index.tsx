import React, { useState } from "react";
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
  border-bottom: 1px solid ${({ theme }) => theme.white}29;
`;

const HeaderContainer = styled.div`
  width: 100%;
  padding: 0px 24px;
  position: relative;
`;

const Header: React.FC = () => {
  const [forceCompact, setForceCompact] = useState(false);
  return (
    <Container>
      <HeaderContainer>
        <DesktopHeader forceCompact={forceCompact} onOverflowChange={setForceCompact} />
        <MobileHeader forceCompact={forceCompact} />
      </HeaderContainer>
    </Container>
  );
};

export default Header;
