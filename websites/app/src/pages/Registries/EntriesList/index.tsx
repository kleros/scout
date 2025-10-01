import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { GraphItem, registryMap } from 'utils/items';
import Entry from './Entry';
import { ITEMS_PER_PAGE } from '~src/pages/Registries';
import { useChallengePeriodDuration } from 'hooks/countdown';

const useRegistryDurations = () => {
  const singleTagsDuration = useChallengePeriodDuration(registryMap.Single_Tags);
  const tagsQueriesDuration = useChallengePeriodDuration(registryMap.Tags_Queries);
  const tokensDuration = useChallengePeriodDuration(registryMap.Tokens);
  const cdnDuration = useChallengePeriodDuration(registryMap.CDN);

  return useMemo(() => ({
    [registryMap.Single_Tags]: singleTagsDuration,
    [registryMap.Tags_Queries]: tagsQueriesDuration,
    [registryMap.Tokens]: tokensDuration,
    [registryMap.CDN]: cdnDuration,
  }), [singleTagsDuration, tagsQueriesDuration, tokensDuration, cdnDuration]);
};

const EntriesContainer = styled.div`
  width: 100%;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  justify-content: center;
  overflow-x: hidden;
  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(4, minmax(0, 1fr));
    `
  )}
`;

interface IEntriesList {
  searchData: GraphItem[];
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
  );
};

export default EntriesList;
