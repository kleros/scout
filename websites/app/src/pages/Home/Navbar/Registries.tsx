import React from 'react'
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
  const [isExpanded, setIsExpanded] = React.useState(false)
  const isSelected = (searchParams.get('registry')) === name || 
                     (name === 'Tags' && ['Single Tags', 'Tags Queries'].includes(searchParams.get('registry') || ''))
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  useFocusOutside(dropdownRef, () => setIsExpanded(false));

  const handleItemClick = (event, itemName) => {
    event.stopPropagation()
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

  const handleSubItemClick = (event, subItemName) => {
    event.stopPropagation()
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev.toString())
      newParams.set('registry', subItemName)
      // bounce to page 1
      newParams.set('page', '1')
      newParams.delete('attachment')
      return newParams
    })
  }

  return (
    <>
      <StyledItem key={name} onClick={(e) => handleItemClick(e, name)} isSelected={isSelected}>
        {name}
        {name === 'Tags' && (
          <FilterDropdownIconWrapper open={isExpanded}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        )}
      </StyledItem>
      {subItems && isExpanded && (
        <StyledDropdown ref={dropdownRef}>
          {subItems.map((subItem) => (
            <StyledItem
              key={subItem.name}
              onClick={(e) => handleSubItemClick(e, subItem.name)}
              isSelected={searchParams.get('registry') === subItem.name}
            >
              {subItem.name}
            </StyledItem>
          ))}
        </StyledDropdown>
      )}
    </>
  )
}

const ITEMS = [
  { name: 'Tags', subItems: [{ name: 'Single Tags' }, { name: 'Tags Queries' }] },
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
