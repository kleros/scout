import React, { useMemo } from 'react';
import { useAttachment } from 'hooks/useAttachment';
import { useItemCountsQuery } from 'hooks/queries';
import { KLEROS_CDN_BASE } from 'consts/index';
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

  const policyURI = useMemo(() => {
    if (!registryName || !countsData) return undefined;
    return countsData[registryName]?.metadata?.policyURI;
  }, [registryName, countsData]);

  return (
    <StyledLabel
      onClick={() => {
        if (policyURI) {
          openAttachment(`${KLEROS_CDN_BASE}${policyURI}`);
        }
      }}
    >
      Policy
    </StyledLabel>
  );
};
export default PolicyButton;
