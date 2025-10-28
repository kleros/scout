import React from 'react';
import styled from 'styled-components';
import { hoverShortTransitionTiming } from 'styles/commonStyles';

const StyledLabel = styled.label`
  ${hoverShortTransitionTiming}
  cursor: pointer;
  color: ${({ theme }) => theme.secondaryText};
  font-family: "Open Sans", sans-serif;
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
    <StyledLabel onClick={onClick}>
      Export List
    </StyledLabel>
  );
};

export default ExportButton;