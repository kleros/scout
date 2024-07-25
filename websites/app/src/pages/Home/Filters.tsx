import React, { useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import { relevantNetworks } from 'utils/fetchItems'
import DownDirectionIcon from 'tsx:svgs/icons/down-direction.svg'
import { useFocusOutside } from 'hooks/useFocusOutside'

const FilterContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 12px;
`

const DropdownContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const FilterDropdown = styled.div<{ open: boolean }>`
  display: flex;
  font-family: 'Oxanium', sans-serif;
  font-size: 18px;
  font-weight: 600;
  height: 28px;
  align-items: center;
  padding: 0 4px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

const FilterDropdownIconWrapper = styled.div<{ open: boolean }>`
  display: flex;
  margin-left: 8px;
  padding-bottom: 4px;
  align-self: center;
  align-items: center;
  transform: ${({ open }) => (open ? 'rotate(-180deg);' : 'rotate(0deg)')};
`

const FilterOptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #801fdc;
  margin-top: 30px;
  position: absolute;
  border-radius: 8px;
  z-index: 10;
`

// when selected, has a border, bold and more opacity
const FilterOption = styled.div<{ selected: boolean }>`
  text-align: center;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  padding: 6px;
  font-weight: ${({ selected }) => (selected ? 'bold' : 'normal')};
  opacity: ${({ selected }) => (selected ? '100%' : '60%')};
  cursor: pointer;
  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

// renders right of the dropdown filter
const RemovableFilterContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`

const RemovableFilter = styled.div`
  display: flex;
  background-color: #380c65;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  font-weight: 400;
  height: 28px;
  align-items: center;
  padding: 0 4px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

const statusLabels = {
  'Registered': 'Registered',
  'RegistrationRequested': 'Registration Requested',
  'ClearingRequested': 'Removal Requested',
  'Absent': 'Removed'
};

const registrationStatuses = Object.keys(statusLabels);

const RegistrationStatus: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const status = useMemo(() => searchParams.get('status') || 'Registered', [searchParams])
  const dropdownRef = useRef(null)
  
  useFocusOutside(dropdownRef, () => setOpen(false))

  const toggleStatus = (newStatus: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('status', newStatus || 'Registered')
      newParams.set('page', '1')
      return newParams
    }, { replace: true })
  }

  return (
    <FilterContainer>
      <DropdownContainer ref={dropdownRef}>
        <FilterDropdown open={open} onClick={() => setOpen(!open)}>
          Registration Status
          <FilterDropdownIconWrapper open={open}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdown>
        {open && (
          <FilterOptionContainer>
            {registrationStatuses.map((s) => (
              <FilterOption
                key={s}
                selected={status === s}
                onClick={() => toggleStatus(s)}
              >
                {statusLabels[s]}
              </FilterOption>
            ))}
          </FilterOptionContainer>
        )}
      </DropdownContainer>
      <RemovableFilterContainer>
        <RemovableFilter onClick={() => toggleStatus('')}>
          {statusLabels[status]} ✕
        </RemovableFilter>
      </RemovableFilterContainer>
    </FilterContainer>
  )
}

const ChallengeStatus: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState<boolean>(false)
  const disputed = useMemo(() => searchParams.get('disputed'), [searchParams])
  const dropdownRef = useRef(null)
  useFocusOutside(dropdownRef, () => setOpen(false))

  const toggleDisputed = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev.toString())
      newParams.delete('disputed')
      if (value) {
        newParams.append('disputed', value)
      }
      newParams.set('page', '1')
      return newParams
    })
  }

  const challengeStatuses = [
    { value: 'true', label: 'Challenged' },
    { value: 'false', label: 'Unchallenged' }
  ]

  return (
    <FilterContainer>
      <DropdownContainer ref={dropdownRef}>
        <FilterDropdown open={open} onClick={() => setOpen(!open)}>
          Challenge Status
          <FilterDropdownIconWrapper open={open}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdown>
        {open && (
          <FilterOptionContainer>
            {challengeStatuses.map((s) => (
              <FilterOption
                key={s.value}
                selected={disputed === s.value}
                onClick={() => toggleDisputed(s.value)}
              >
                {s.label}
              </FilterOption>
            ))}
          </FilterOptionContainer>
        )}
      </DropdownContainer>
      {disputed && (
        <RemovableFilterContainer>
          <RemovableFilter onClick={() => toggleDisputed('')}>
            {disputed === 'true' ? 'Challenged' : 'Unchallenged'} ✕
          </RemovableFilter>
        </RemovableFilterContainer>
      )}
    </FilterContainer>
  )
}

const Networks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState<boolean>(false)
  const networks = useMemo(() => searchParams.getAll('network'), [searchParams])
  const dropdownRef = useRef(null)
  useFocusOutside(dropdownRef, () => setOpen((open) => false))

  const toggleNetwork = (network: string) => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      const networks = newParams.getAll('network')
      if (networks.includes(network)) {
        // remove
        newParams.delete('network', network)
      } else {
        // add
        newParams.append('network', network)
      }
      // bounce to page 1
      newParams.delete('page')
      newParams.append('page', '1')
      return newParams
    })
  }

  // todo refactor
  // adding networks manually should be a crime
  return (
    <FilterContainer>
      <DropdownContainer ref={dropdownRef}>
        <FilterDropdown open={open} onClick={() => setOpen((open) => !open)}>
          Network
          <FilterDropdownIconWrapper open={open}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdown>
        {open && (
          <FilterOptionContainer>
            {relevantNetworks.map((n) => (
              <FilterOption
                key={n.chainId}
                selected={networks.includes(String(n.chainId))}
                onClick={() => toggleNetwork(String(n.chainId))}
              >
                {n.name}
              </FilterOption>
            ))}
          </FilterOptionContainer>
        )}
      </DropdownContainer>
      <RemovableFilterContainer>
        {networks.length === 0 ? (
          <RemovableFilter>All Networks</RemovableFilter>
        ) : (
          networks.map((s) => (
            <RemovableFilter key={s} onClick={() => toggleNetwork(s)}>
              {relevantNetworks.find((n) => s === String(n.chainId))?.name} ✕
            </RemovableFilter>
          ))
        )}
      </RemovableFilterContainer>
    </FilterContainer>
  )
}

const Ordering: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const direction = useMemo(
    () => searchParams.get('orderDirection'),
    [searchParams]
  )

  const toggleDirection = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      const direction = newParams.get('orderDirection')
      newParams.delete('orderDirection')
      if (direction === 'desc') {
        newParams.append('orderDirection', 'asc')
      } else {
        newParams.append('orderDirection', 'desc')
      }
      // bounce to page 1
      newParams.delete('page')
      newParams.append('page', '1')
      return newParams
    })
  }

  return (
    <FilterContainer>
      <DropdownContainer>
        <FilterDropdown
          open={direction === 'desc'}
          onClick={() => toggleDirection()}
        >
          {direction === 'desc' ? 'Newest' : 'Oldest'}
          <FilterDropdownIconWrapper open={direction === 'asc'}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdown>
      </DropdownContainer>
    </FilterContainer>
  )
}

const Container = styled.div`
  display: flex;
  width: 84vw;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: ${responsiveSize(24, 28)};

  ${landscapeStyle(
    () => css`
      width: 80%;
      flex-direction: row;
    `
  )}
`

const Filters: React.FC = () => {
  return (
    <Container>
      <RegistrationStatus />
      <ChallengeStatus />
      <Networks />
      <Ordering />
    </Container>
  )
}

export default Filters
