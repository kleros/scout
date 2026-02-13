import React, { useMemo } from 'react';
import { useAttachment } from 'hooks/useAttachment';
import { FocusedRegistry } from 'utils/itemCounts';
import { useItemCountsQuery } from 'hooks/queries';
import styled from 'styled-components';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import Skeleton from 'react-loading-skeleton';

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
  const { data: countsData, isLoading } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined;
    return countsData[registryName];
  }, [registryName, countsData]);

  if (isLoading || !registry?.metadata?.policyURI) {
    return <Skeleton width={42} height={18} />;
  }

  return (
    <StyledLabel
      onClick={() => {
        openAttachment(`https://cdn.kleros.link${registry.metadata.policyURI}`);
      }}
    >
      Policy
    </StyledLabel>
  );
};
export default PolicyButton;
