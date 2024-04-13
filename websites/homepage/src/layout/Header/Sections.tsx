import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useNavigate } from 'react-router-dom'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  gap: 32px;
  position: relative;
  margin-top: 8px;

  ${landscapeStyle(
    () => css`
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 0;
    `
  )}
`

const StyledItem = styled.div<{ isSelected: boolean }>`
  text-decoration: ${({ isSelected }) => (isSelected ? 'underline' : 'none')};
  font-weight: ${({ isSelected }) => (isSelected ? 600 : 400)};
  font-family: 'Oxanium', sans-serif;
  cursor: pointer;
`

interface IItem {
  name: string
  isSelected: boolean
  onClick: (event: React.MouseEvent) => void
}

const Item: React.FC<IItem> = ({ name, isSelected, onClick }) => {
  return (
    <StyledItem onClick={onClick} isSelected={isSelected}>
      {name}
    </StyledItem>
  )
}

const ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'For Users', path: '/for-users' },
  { name: 'For Builders', path: '/for-builders' },
]

const Sections: React.FC = () => {
  const navigate = useNavigate()

  const handleItemClick = (path: string) => {
    navigate(path)
  }

  return (
    <Container>
      {ITEMS.map((item) => (
        <Item
          key={item.name}
          name={item.name}
          isSelected={window.location.pathname === item.path}
          onClick={() => handleItemClick(item.path)}
        />
      ))}
    </Container>
  )
}

export default Sections
