import React from 'react';
import styled from 'styled-components';
import { hoverShortTransitionTiming } from 'styles/commonStyles';

// A real button (keyboard and screen readers reach it) that keeps the toolbar's text-link look.
const StyledButton = styled.button`
  ${hoverShortTransitionTiming}
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.secondaryText};
  font-family: "Manrope", sans-serif;
  font-size: 14px;
  font-weight: 400;

  :hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

interface ExportButtonProps {
  onClick: () => void;
  registryName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onClick, registryName }) => {
  // Only show export button when a registry is selected
  if (!registryName) {
    return null;
  }

  return (
    <StyledButton type="button" aria-haspopup="dialog" onClick={onClick}>
      Export List
    </StyledButton>
  );
};

export default ExportButton;
