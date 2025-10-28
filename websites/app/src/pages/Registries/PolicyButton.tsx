import React, { useMemo } from 'react';
import { useAttachment } from 'hooks/useAttachment';
import { FocusedRegistry } from 'utils/itemCounts';
import { useItemCountsQuery } from 'hooks/queries';
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
`

interface PolicyButtonProps {
  registryName?: string;
}

const PolicyButton: React.FC<PolicyButtonProps> = ({ registryName }) => {
  const openAttachment = useAttachment();
  const { data: countsData } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined;
    return countsData[registryName];
  }, [registryName, countsData]);

  return (
    <StyledLabel
      onClick={() => {
        if (registry?.metadata.policyURI) {
          openAttachment(`https://cdn.kleros.link${registry.metadata.policyURI}`);
        }
      }}
    >
      Policy
    </StyledLabel>
  );
};
export default PolicyButton;