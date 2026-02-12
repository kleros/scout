import React, { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useDebounce } from 'react-use'
import { useRegistryFilters } from 'context/FilterContext'
import SearchIcon from 'svgs/icons/search.svg'
import { hoverLongTransitionTiming } from 'styles/commonStyles';

const Container = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  background-color: transparent;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding-left: 16px;
  width: 100%;
  height: 40px;

  ${landscapeStyle(
    () => css`
      width: 630px;
    `
  )}

  svg {
    flex-shrink: 0;
  }

  :hover {
    background-color: #FFFFFF1D;
  }
`

const StyledInput = styled.input`
  flex-grow: 1;
  padding: 8px;
  background: transparent;
  font-size: 14px;
  outline: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  border-radius: 12px;

  ::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`

const Search: React.FC = () => {
  const filters = useRegistryFilters()
  const [searchTerm, setSearchTerm] = useState<string>(filters.text)
  const [appliedSearch, setAppliedSearch] = useState<boolean>(true)

  useEffect(() => {
    setSearchTerm(filters.text)
    setAppliedSearch(true)
  }, [filters.text])

  const applySearch = () => {
    if (!appliedSearch) {
      filters.setText(searchTerm)
      setAppliedSearch(true)
    }
  }

  useDebounce(
    () => {
      applySearch()
    },
    500,
    [searchTerm]
  )

  const changeSearchTerm = (text: string) => {
    setAppliedSearch(false)
    setSearchTerm(text)
  }

  return (
    <Container>
      <SearchIcon />
      <StyledInput
        type="text"
        value={searchTerm}
        onChange={(e) => changeSearchTerm(e.target.value)}
        placeholder="Search with keywords, address, etc."
      />
    </Container>
  )
}

export default Search
