import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import ErrorState from 'components/ErrorState'
import { StyledButton } from 'components/Button'
import { commify } from 'utils/commify'

/** What a profile tab reports to the page: its counts once its list is read, or that it failed. */
export interface ListCount {
  /** Rows left after the filters and the search. */
  shown: number
  /** Every row the address has in this list. */
  total: number
}
export type ListReport = ListCount | 'failed' | null

export const ListSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading">
    <Skeleton height={100} style={{ marginBottom: 16 }} count={3} />
  </div>
)

interface ListErrorProps {
  /** e.g. "The pending submissions did not load." */
  title: string
  onRetry: () => void
  retrying: boolean
}

export const ListError: React.FC<ListErrorProps> = ({ title, onRetry, retrying }) => (
  <ErrorState
    title={title}
    message="The data service did not answer. Check your connection and try again."
    onRetry={onRetry}
    retrying={retrying}
  />
)

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0 24px;
  color: ${({ theme }) => theme.secondaryText};

  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const GuideLink = styled(Link)`
  color: ${({ theme }) => theme.primaryBlue};
  text-decoration: underline;
  text-underline-offset: 3px;
`

interface ListEmptyProps {
  /** Plural noun of the list, e.g. "pending submissions". */
  noun: string
  /** The address has no row at all in this list (before filters and search). */
  noRows: boolean
  /** Shown when the address has no row: e.g. "You have no pending submissions." */
  noRowsText: string
  /** Shown under noRowsText on your own profile (a next step). */
  ownNextStep?: boolean
  isOwnProfile: boolean
  searchText: string
  /** Without the search, the filters would still leave nothing. */
  filtersExcludeAll: boolean
  onClearSearch: () => void
  onResetFilters: () => void
}

/** Says why a profile list is empty and what to do next. */
export const ListEmpty: React.FC<ListEmptyProps> = ({
  noun,
  noRows,
  noRowsText,
  ownNextStep,
  isOwnProfile,
  searchText,
  filtersExcludeAll,
  onClearSearch,
  onResetFilters,
}) => {
  const search = searchText.trim()

  if (noRows) {
    return (
      <Empty role="status">
        <p>{noRowsText}</p>
        {isOwnProfile && ownNextStep ? (
          <p>
            Anyone can submit an entry with a deposit: <GuideLink to="/guide">read the guide</GuideLink>.
          </p>
        ) : null}
      </Empty>
    )
  }

  let text: string
  if (search && filtersExcludeAll) text = `No ${noun} match “${search}” and the current filters.`
  else if (search) text = `No ${noun} match “${search}”.`
  else text = `No ${noun} match the current filters.`

  return (
    <Empty role="status">
      <p>{text}</p>
      <Actions>
        {search ? (
          <StyledButton type="button" variant="secondary" size="small" onClick={onClearSearch}>
            Clear search
          </StyledButton>
        ) : null}
        {filtersExcludeAll || !search ? (
          <StyledButton type="button" variant="secondary" size="small" onClick={onResetFilters}>
            Reset filters
          </StyledButton>
        ) : null}
      </Actions>
    </Empty>
  )
}

const Note = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

/**
 * Says that a list was cut at the read limit (the newest rows are read first), so search, filters
 * and sorting only see these rows.
 */
export const CappedNote: React.FC<{ count: number; noun: string }> = ({ count, noun }) => (
  <Note>
    Showing the newest {commify(count)} {noun} of this address. Search, filters and sorting apply
    to these only.
  </Note>
)
