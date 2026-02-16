import React, { useMemo, useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle, BREAKPOINT_LANDSCAPE } from 'styles/landscapeStyle';
import { GraphItem, registryMap } from 'utils/items';
import Item from './Item';
import ItemListView from './ItemListView';
import ItemCompactView from './ItemCompactView';
import ListHeader from './ListHeader';
import { ITEMS_PER_PAGE } from 'pages/Registries';
import { ViewMode } from 'components/ViewSwitcher';
import { useRegistryParameters } from 'hooks/useRegistryParameters';

const useRegistryDurations = () => {
  const singleTagsParams = useRegistryParameters(registryMap['single-tags']);
  const tagsQueriesParams = useRegistryParameters(registryMap['tags-queries']);
  const tokensParams = useRegistryParameters(registryMap['tokens']);
  const cdnParams = useRegistryParameters(registryMap['cdn']);

  return useMemo(() => ({
    [registryMap['single-tags']]: singleTagsParams.data ? Number(singleTagsParams.data.challengePeriodDuration) : null,
    [registryMap['tags-queries']]: tagsQueriesParams.data ? Number(tagsQueriesParams.data.challengePeriodDuration) : null,
    [registryMap['tokens']]: tokensParams.data ? Number(tokensParams.data.challengePeriodDuration) : null,
    [registryMap['cdn']]: cdnParams.data ? Number(cdnParams.data.challengePeriodDuration) : null,
  }), [singleTagsParams.data, tagsQueriesParams.data, tokensParams.data, cdnParams.data]);
};

const ListViewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CompactListWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT_LANDSCAPE);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINT_LANDSCAPE);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const registryAddress = searchData[0]?.registryAddress;

  if (viewMode === 'list') {
    // Mobile: compact rows (no header)
    if (isMobile) {
      return (
        <CompactListWrapper>
          {searchData.slice(0, ITEMS_PER_PAGE).map((item) => (
            <ItemCompactView
              key={item.id}
              item={item}
              challengePeriodDuration={registryDurations[item.registryAddress]}
            />
          ))}
        </CompactListWrapper>
      );
    }

    // Desktop: full grid list with header
    return (
      <ListViewWrapper>
        <ListHeader registryAddress={registryAddress} />
        <ItemsContainer viewMode={viewMode}>
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
    <ItemsContainer viewMode={viewMode}>
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
