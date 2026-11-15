import React, { useEffect, useRef, useState } from 'react'
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
  padding-right: 4px;
  width: 100%;
  height: 40px;
  flex: 1 1 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      flex: 0 1 396px;
    `
  )}

  svg {
    flex-shrink: 0;
  }

  :hover {
    background-color: ${({ theme }) => theme.hoverBackground};
  }

  /* The field itself draws no ring (it sits inside the pill): the pill shows keyboard focus. */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.primaryBlue};
    outline-offset: 2px;
  }
`

const StyledInput = styled.input`
  flex-grow: 1;
  min-width: 0;
  padding: 8px;
  background: transparent;
  font-size: 14px;
  outline: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  border-radius: 12px;
  -webkit-appearance: none;
  appearance: none;

  /* The pill around the field draws the focus ring. */
  &:focus,
  &:focus-visible {
    outline: none;
  }

  ::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }

  /* The clear button below replaces the browser's own, which not every browser draws. */
  ::-webkit-search-cancel-button,
  ::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
  }
`

const ClearButton = styled.button.attrs({ type: 'button' })`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 20px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    background: ${({ theme }) => theme.hoverBackground};
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`

interface SearchBarProps {
  text: string
  setText: (value: string) => void
  className?: string
  placeholder?: string
  /** Accessible name of the field, e.g. "Search Tokens". */
  label?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  text,
  setText,
  className,
  placeholder = "Search with keywords, address, etc.",
  label = 'Search',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(text)
  const [appliedSearch, setAppliedSearch] = useState<boolean>(true)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const clearSearch = () => {
    setSearchTerm('')
    setAppliedSearch(true)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <Container className={className} role="search">
      <SearchIcon />
      <StyledInput
        ref={inputRef}
        type="search"
        value={searchTerm}
        onChange={(e) => changeSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && searchTerm) {
            e.preventDefault()
            clearSearch()
          }
        }}
        placeholder={placeholder}
        aria-label={label}
      />
      {searchTerm ? (
        <ClearButton aria-label="Clear search" onClick={clearSearch}>
          <span aria-hidden="true">×</span>
        </ClearButton>
      ) : null}
    </Container>
  )
}

export default SearchBar
