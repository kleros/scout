import React from "react";
import styled from "styled-components";

import { hoverShortTransitionTiming } from "styles/commonStyles";

import { Link } from "react-router-dom";

import KlerosScoutLogo from "svgs/header/kleros-scout.svg";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

const StyledKlerosScoutLogo = styled(KlerosScoutLogo)`
  ${hoverShortTransitionTiming}
  max-height: 40px;
  width: auto;

  &:hover {
    path {
      fill: ${({ theme }) => theme.white}BF;
    }
  }
`;

const Logo: React.FC = () => (
  <Container>
    {" "}
    <Link to={"/"}>
      <StyledKlerosScoutLogo />
    </Link>
  </Container>
);

export default Logo;
