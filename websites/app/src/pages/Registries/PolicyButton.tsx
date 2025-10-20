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

const PolicyButton: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollTop = useScrollTop();

  const { data: countsData } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('registry');
    if (registryLabel === null || !countsData) return undefined;
    return countsData[registryLabel];
  }, [searchParams, countsData]);

  return (
    <StyledLabel
      onClick={() => {
        if (registry?.metadata.policyURI) {
          setSearchParams({ attachment: `https://cdn.kleros.link${registry.metadata.policyURI}` });
          scrollTop();
        }
      }}
    >
      Policy
    </StyledLabel>
  );
};
export default PolicyButton;