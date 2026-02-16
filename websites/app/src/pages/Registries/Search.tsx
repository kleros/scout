import React, { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useDebounce } from 'react-use'
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
  flex: 1 1 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      flex: 0 1 316px;
    `
  )}

  svg {
    flex-shrink: 0;
  }

  :hover {
    background-color: ${({ theme }) => theme.hoverBackground};
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

interface SearchBarProps {
  text: string
  setText: (value: string) => void
  className?: string
  placeholder?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({ text, setText, className, placeholder = "Search with keywords, address, etc." }) => {
  const [searchTerm, setSearchTerm] = useState<string>(text)
  const [appliedSearch, setAppliedSearch] = useState<boolean>(true)

  useEffect(() => {
    setSearchTerm(text)
    setAppliedSearch(true)
  }, [text])

  const applySearch = () => {
    if (!appliedSearch) {
      setText(searchTerm)
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

  const changeSearchTerm = (value: string) => {
    setAppliedSearch(false)
    setSearchTerm(value)
  }

  return (
    <Container className={className}>
      <SearchIcon />
      <StyledInput
        type="text"
        value={searchTerm}
        onChange={(e) => changeSearchTerm(e.target.value)}
        placeholder={placeholder}
      />
    </Container>
  )
}

export default SearchBar
