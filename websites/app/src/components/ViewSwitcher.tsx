import React from 'react'
import styled from 'styled-components'
import CardsIcon from 'svgs/icons/cards.svg'
import ListsIcon from 'svgs/icons/lists.svg'

const Container = styled.div<{ hide?: boolean }>`
  display: ${({ hide }) => (hide ? 'none' : 'flex')};
  align-items: center;
  gap: 0;
  background: ${({ theme }) => theme.gradientCard};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 9999px;
  padding: 0;
  height: 40px;
  flex-shrink: 0;
`

// The current view is the bright one, on a raised background; the other is dimmer until hovered.
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
    isActive ? theme.activeBackground : 'transparent'};
  cursor: ${({ isActive, disabled }) =>
    disabled ? 'not-allowed' : isActive ? 'default' : 'pointer'};
  transition: all 0.2s ease;
  color: ${({ isActive, theme }) =>
    isActive ? theme.primaryText : theme.tertiaryText};
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
          ? theme.activeBackground
          : theme.hoverBackground};
    color: ${({ disabled, theme }) =>
      disabled ? theme.secondaryText : theme.primaryText};
  }

  /* Inside the pill, so the ring is drawn within the button. */
  &:focus-visible {
    outline-offset: -2px;
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
    <Container hide={shouldHide} role="group" aria-label="View">
      <ViewButton
        type="button"
        isActive={viewMode === 'cards'}
        onClick={() => onViewModeChange('cards')}
        aria-label="Card view"
        aria-pressed={viewMode === 'cards'}
      >
        <CardsIcon />
      </ViewButton>
      <ViewButton
        type="button"
        isActive={viewMode === 'list'}
        onClick={() => !disableListView && onViewModeChange('list')}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
        disabled={disableListView}
      >
        <ListsIcon />
      </ViewButton>
    </Container>
  )
}

export default ViewSwitcher
