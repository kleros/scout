import React from 'react'
import styled, { css } from 'styled-components'
import CardsIcon from 'svgs/icons/cards.svg'
import ListsIcon from 'svgs/icons/lists.svg'
import { landscapeStyle } from 'styles/landscapeStyle'

const Container = styled.div<{ hide?: boolean }>`
  display: none;
  align-items: center;
  gap: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 9999px;
  padding: 0;
  height: 40px;

  ${landscapeStyle(
    () => css`
      display: ${({ hide }) => (hide ? 'none' : 'flex')};
    `
  )}
`

const ViewButton = styled.button<{ isActive: boolean; disabled?: boolean }>`
  display: ${({ disabled }) => (disabled ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
  padding: 8px;
  flex: 1;
  height: 100%;
  border-radius: 0;
  border: none;
  background: ${({ isActive, theme }) =>
    isActive ? theme.backgroundFour : 'transparent'};
  cursor: ${({ isActive, disabled }) =>
    disabled ? 'not-allowed' : isActive ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  color: ${({ isActive, theme }) =>
    isActive ? theme.buttonDisabledText : theme.secondaryText};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:first-child {
    border-top-left-radius: 9999px;
    border-bottom-left-radius: 9999px;
  }

  &:last-child {
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
  }

  svg {
    width: 24px !important;
    height: 24px !important;
    display: block;

    * {
      fill: currentColor;
    }
  }

  &:hover {
    background: ${({ isActive, disabled, theme }) =>
      disabled
        ? 'transparent'
        : isActive
          ? theme.backgroundFour
          : 'rgba(255, 255, 255, 0.1)'};
    color: ${({ isActive, disabled, theme }) =>
      disabled
        ? theme.secondaryText
        : isActive
          ? theme.buttonDisabledText
          : theme.primaryText};
  }
`

export type ViewMode = 'cards' | 'list'

interface ViewSwitcherProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  disableListView?: boolean
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  viewMode,
  onViewModeChange,
  disableListView = false,
}) => {
  // Hide the entire switcher if list view is disabled (meaning only cards view is available)
  const shouldHide = disableListView

  return (
    <Container hide={shouldHide}>
      <ViewButton
        isActive={viewMode === 'cards'}
        onClick={() => onViewModeChange('cards')}
        aria-label="Card view"
      >
        <CardsIcon />
      </ViewButton>
      <ViewButton
        isActive={viewMode === 'list'}
        onClick={() => !disableListView && onViewModeChange('list')}
        aria-label="List view"
        disabled={disableListView}
      >
        <ListsIcon />
      </ViewButton>
    </Container>
  )
}

export default ViewSwitcher
