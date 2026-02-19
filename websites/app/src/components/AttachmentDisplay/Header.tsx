import React from "react";
import styled from "styled-components";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

import PaperClip from "svgs/icons/paperclip.svg";
import Arrow from "svgs/icons/arrow-left.svg";

import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";

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
  color: ${({ theme }) => theme.secondaryBlue};
`;

const StyledPaperClip = styled(PaperClip)`
  width: ${responsiveSize(16, 24)};
  height: ${responsiveSize(16, 24)};
  path {
    fill: ${({ theme }) => theme.secondaryBlue};
  }
`;

const StyledArrow = styled(Arrow)`
  path {
    fill: ${({ theme }) => theme.secondaryBlue};
    ${hoverShortTransitionTiming}
  }
`;

const ReturnButton = styled(Link)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if user is trying to open in new tab (Ctrl+Click, Cmd+Click, or middle click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      return;
    }

    // For normal clicks, just remove the attachment param
    e.preventDefault();

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('attachment');
      return newParams;
    }, { replace: true });
  };

  return (
    <Container>
      <TitleContainer>
        <StyledPaperClip />
        <Title>File</Title>
      </TitleContainer>
      <ReturnButton to="#" onClick={handleClick}>
        <StyledArrow />
        Return
      </ReturnButton>
    </Container>
  );
};

export default Header;
