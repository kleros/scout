import React, { useMemo } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { GraphItem, registryMap } from 'utils/fetchItems'
import Entry from './Entry'
import { ITEMS_PER_PAGE } from 'pages/Home'

interface EntriesContainerProps {
  isCDN: boolean;
}

const EntriesContainer = styled.div<EntriesContainerProps>`
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
  const isCDN = useMemo(() => {
    return searchData.some(item => item.registryAddress === registryMap['CDN']);
  }, [searchData]);

  return (
    <EntriesContainer isCDN={isCDN}>
      {searchData.slice(0, ITEMS_PER_PAGE).map((item) => (
        <Entry key={item.id} item={item} />
      ))}
    </EntriesContainer>
  )
}

export default EntriesList
