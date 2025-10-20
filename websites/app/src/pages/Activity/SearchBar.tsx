import React, { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useDebounce } from 'react-use'
import { useSearchParams } from 'react-router-dom'
import SearchIcon from 'svgs/icons/search.svg'
import { hoverLongTransitionTiming } from 'styles/commonStyles';

const Container = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  background-color: #FFFFFF0D;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding-left: 16px;
  width: 100%;
  height: 40px;

  ${landscapeStyle(
    () => css`
      width: 400px;
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

const ActivitySearchBar: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [appliedSearch, setAppliedSearch] = useState<boolean>(true)

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '')
    setAppliedSearch(true)
  }, [searchParams])

  const applySearch = () => {
    if (!appliedSearch) {
      setSearchParams((prev) => {
        const prevParams = prev.toString()
        const newParams = new URLSearchParams(prevParams)
        newParams.delete('search')
        if (searchTerm) {
          newParams.append('search', searchTerm)
        }
        // bounce to page 1
        newParams.delete('page')
        newParams.append('page', '1')
        return newParams
      })
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

export default ActivitySearchBar