import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import { registryMap } from 'utils/fetchItems';

const StyledLabel = styled.label`
  ${hoverShortTransitionTiming}
  cursor: pointer;
  color: ${({ theme }) => theme.secondaryText};

  :hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

interface ExportButtonProps {
  onClick: () => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  const [searchParams] = useSearchParams();

  const selectedRegistries = searchParams.getAll('registry');
  const registryAddress = useMemo(() => {
    return selectedRegistries.length === 1 ? registryMap[selectedRegistries[0] as keyof typeof registryMap] : undefined;
  }, [selectedRegistries]);

  // Only show export button when a single registry is selected
  if (!registryAddress) {
    return null;
  }

  return (
    <StyledLabel onClick={onClick}>
      Export List
    </StyledLabel>
  );
};

export default ExportButton;