import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { GraphItem } from 'utils/fetchItems'
import Entry from './Entry'
import { ITEMS_PER_PAGE } from 'pages/Home'
import { useMemo } from 'react';
import { useChallengePeriodDuration } from 'hooks/countdown';
import { registryMap } from 'utils/fetchItems';

const useRegistryDurations = () => {
  const tagsDuration = useChallengePeriodDuration(registryMap.Tags);
  const tokensDuration = useChallengePeriodDuration(registryMap.Tokens);
  const cdnDuration = useChallengePeriodDuration(registryMap.CDN);

  return useMemo(() => ({
    [registryMap.Tags]: tagsDuration,
    [registryMap.Tokens]: tokensDuration,
    [registryMap.CDN]: cdnDuration,
  }), [tagsDuration, tokensDuration, cdnDuration]);
};

const EntriesContainer = styled.div`
  width: 80%;
  display: grid;
  gap: 20px 40px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  justify-content: center;
  overflow-x: hidden;
  
  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(4, minmax(0, 1fr));
    `
  )}
`

interface IEntriesList {
  searchData: GraphItem[]
}

const EntriesList: React.FC<IEntriesList> = ({ searchData }) => {
  const registryDurations = useRegistryDurations();

  return (
    <EntriesContainer>
      {searchData.slice(0, ITEMS_PER_PAGE).map((item) => (
        <Entry 
          key={item.id} 
          item={item} 
          challengePeriodDuration={registryDurations[item.registryAddress]}
        />
      ))}
    </EntriesContainer>
  )
}

export default EntriesList
