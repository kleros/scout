import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

import PaperClip from "svgs/icons/paperclip.svg";
import Arrow from "svgs/icons/arrow-left.svg";

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

const StyledArrow = styled(Arrow)`
  path {
    fill: white;
  }
`;

const StyledButton = styled.button`
  background-color: transparent;
  padding: 0;
  color: white;
  border: 0;
  font-size: 22px;
  cursor: pointer;
`;

const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate(-1);
  };

  return (
    <Container>
      <TitleContainer>
        <StyledPaperClip />
        <Title>File</Title>{" "}
      </TitleContainer>
      <StyledButton onClick={handleReturn}><StyledArrow /> Return</StyledButton>
    </Container>
  );
};

export default Header;
