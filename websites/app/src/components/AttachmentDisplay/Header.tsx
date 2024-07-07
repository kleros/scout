import React from "react";
import styled from "styled-components";

import PaperClip from "svgs/icons/paperclip.svg";

import { responsiveSize } from "styles/responsiveSize";

const Container = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h1`
  margin: 0px;
  font-size: ${responsiveSize(16, 24)};
`;

const StyledPaperClip = styled(PaperClip)`
  width: ${responsiveSize(16, 24)};
  height: ${responsiveSize(16, 24)};
  path {
    fill: white;
  }
`;

const Header: React.FC = () => {
  return (
    <Container>
      <TitleContainer>
        <StyledPaperClip />
        <Title>File</Title>{" "}
      </TitleContainer>
    </Container>
  );
};

export default Header;
