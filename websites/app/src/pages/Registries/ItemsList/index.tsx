import React, { useMemo, useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { GraphItem, registryMap } from 'utils/items';
import Item from './Item';
import ItemListView from './ItemListView';
import ListHeader from './ListHeader';
import { ITEMS_PER_PAGE } from 'pages/Registries';
import { ViewMode } from 'components/ViewSwitcher';
import { useRegistryParameters } from 'hooks/useRegistryParameters';

const useRegistryDurations = () => {
  const singleTagsParams = useRegistryParameters(registryMap.Single_Tags);
  const tagsQueriesParams = useRegistryParameters(registryMap.Tags_Queries);
  const tokensParams = useRegistryParameters(registryMap.Tokens);
  const cdnParams = useRegistryParameters(registryMap.CDN);

  return useMemo(() => ({
    [registryMap.Single_Tags]: singleTagsParams.data ? Number(singleTagsParams.data.challengePeriodDuration) : null,
    [registryMap.Tags_Queries]: tagsQueriesParams.data ? Number(tagsQueriesParams.data.challengePeriodDuration) : null,
    [registryMap.Tokens]: tokensParams.data ? Number(tokensParams.data.challengePeriodDuration) : null,
    [registryMap.CDN]: cdnParams.data ? Number(cdnParams.data.challengePeriodDuration) : null,
  }), [singleTagsParams.data, tagsQueriesParams.data, tokensParams.data, cdnParams.data]);
};

const ListViewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ItemsContainer = styled.div<{ viewMode: ViewMode }>`
  width: 100%;
  display: ${({ viewMode }) => (viewMode === 'list' ? 'flex' : 'grid')};
  flex-direction: ${({ viewMode }) => (viewMode === 'list' ? 'column' : 'row')};
  gap: ${({ viewMode }) => (viewMode === 'list' ? '0' : '16px')};
  grid-template-columns: ${({ viewMode }) =>
    viewMode === 'cards' ? 'repeat(1, minmax(0, 1fr))' : 'none'};
  justify-content: center;
  overflow-x: hidden;
  ${({ viewMode }) =>
    viewMode === 'cards' &&
    landscapeStyle(
      () => css`
        grid-template-columns: repeat(4, minmax(0, 1fr));
      `,
    )}
`;

interface IItemsList {
  searchData: GraphItem[];
  viewMode: ViewMode;
}

const ItemsList: React.FC<IItemsList> = ({ searchData, viewMode }) => {
  const registryDurations = useRegistryDurations();
  const [shouldForceCardsView, setShouldForceCardsView] = useState(false);

  // Determine registry type from first item
  const registryAddress = searchData[0]?.registryAddress;
  const isTokensRegistry = registryAddress === registryMap.Tokens;

  // Check if screen width is sufficient for Tokens list view
  useEffect(() => {
    const checkWidth = () => {
      // Tokens registry needs minimum 1350px to display properly
      // Other registries work fine on smaller screens
      if (isTokensRegistry && viewMode === 'list') {
        const minWidth = 1350;
        setShouldForceCardsView(window.innerWidth < minWidth);
      } else {
        setShouldForceCardsView(false);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [isTokensRegistry, viewMode]);

  // Effective view mode considers forced cards view
  const effectiveViewMode = shouldForceCardsView ? 'cards' : viewMode;

  if (effectiveViewMode === 'list') {
    return (
      <ListViewWrapper>
        <ListHeader registryAddress={registryAddress} />
        <ItemsContainer viewMode={effectiveViewMode}>
          {searchData.slice(0, ITEMS_PER_PAGE).map((item) => (
            <ItemListView
              key={item.id}
              item={item}
              challengePeriodDuration={registryDurations[item.registryAddress]}
            />
          ))}
        </ItemsContainer>
      </ListViewWrapper>
    );
  }

  return (
    <ItemsContainer viewMode={effectiveViewMode}>
      {searchData.slice(0, ITEMS_PER_PAGE).map((item) => (
        <Item
          key={item.id}
          item={item}
          challengePeriodDuration={registryDurations[item.registryAddress]}
        />
      ))}
    </ItemsContainer>
  );
};

export default ItemsList;
