import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useFocusOutside } from 'hooks/useFocusOutside'
import DownDirectionIcon from 'tsx:svgs/icons/down-direction.svg'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  gap: 32px;
  position: relative;

  ${landscapeStyle(
    () => css`
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    `
  )}
`

const StyledDropdown = styled.div`
    display: flex;
    flex-direction: column;
    background-color: grey;
    margin-top: 30px;
    position: absolute;
    border-radius: 8px;
    z-index: 10;
    overflow: hidden;
    padding: 4px 8px;
    gap: 4px;
`

const StyledItem = styled.div<{ isSelected: boolean }>`
  text-decoration: ${({ isSelected }) => (isSelected ? 'underline' : 'none')};
  font-weight: ${({ isSelected }) => (isSelected ? 600 : 400)};
  font-family: 'Oxanium', sans-serif;
  cursor: pointer;
  display: flex;
`

const FilterDropdownIconWrapper = styled.div<{ open: boolean }>`
  display: flex;
  margin-left: 8px;
  padding-bottom: 4px;
  align-self: center;
  align-items: center;
  transform: ${({ open }) => (open ? 'rotate(-180deg);' : 'rotate(0deg)')};
`

interface IItem {
  name: string
  subItems?: IItem[]
}

const Item: React.FC<IItem> = ({ name, subItems }) => {
  let [searchParams, setSearchParams] = useSearchParams()
  const [isExpanded, setIsExpanded] = useState(false)
  const [displayName, setDisplayName] = useState(name)
  const isSelected = (searchParams.get('registry')) === displayName || 
                     (name === 'Tags' && ['Single_Tags', 'Tags_Queries'].includes(searchParams.get('registry') || ''))
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  useFocusOutside(dropdownRef, () => setIsExpanded(false));

  const handleItemClick = (itemName) => {
    if (subItems) {
      setIsExpanded(!isExpanded)
    } else {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev.toString())
        newParams.set('registry', itemName)
        // bounce to page 1
        newParams.set('page', '1')
        newParams.delete('attachment')
        return newParams
      })
    }
  }

  const handleSubItemClick = (subItemName) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev.toString())
      newParams.set('registry', subItemName)
      // bounce to page 1
      newParams.set('page', '1')
      newParams.delete('attachment')
      return newParams
    })
    setDisplayName(subItemName)
    setIsExpanded(false)
  }

  return (
    <>
      <StyledItem key={name} onClick={() => handleItemClick(name)} {...{isSelected}}>
        {displayName.replace('_', ' ')}
        {name === 'Tags' && (
          <FilterDropdownIconWrapper open={isExpanded}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        )}
      {subItems && isExpanded && (
        <StyledDropdown ref={dropdownRef}>
          {subItems.map((subItem) => (
            <StyledItem
              key={subItem.name}
              onClick={(e) => handleSubItemClick(subItem.name)}
              isSelected={searchParams.get('registry') === subItem.name}
            >
              {subItem.name.replace('_', ' ')}
            </StyledItem>
          ))}
        </StyledDropdown>
      )}
      </StyledItem>
    </>
  )
}

const ITEMS = [
  { name: 'Tags', subItems: [{ name: 'Single_Tags' }, { name: 'Tags_Queries' }] },
  { name: 'Tokens' },
  { name: 'CDN' }
]

const Registries: React.FC = () => {
  return (
    <Container>
      {ITEMS.map((item) => (
        <Item key={item.name} name={item.name} subItems={item.subItems} />
      ))}
    </Container>
  )
}
export default Registries
