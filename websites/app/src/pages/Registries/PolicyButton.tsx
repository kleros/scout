import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useScrollTop } from 'hooks/useScrollTop';
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
  const [, setSearchParams] = useSearchParams();
  const scrollTop = useScrollTop();

  const { data: countsData } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined;
    return countsData[registryName];
  }, [registryName, countsData]);

  return (
    <StyledLabel
      onClick={() => {
        if (registry?.metadata.policyURI) {
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set('attachment', `https://cdn.kleros.link${registry.metadata.policyURI}`);
            return newParams;
          });
          scrollTop();
        }
      }}
    >
      Policy
    </StyledLabel>
  );
};
export default PolicyButton;