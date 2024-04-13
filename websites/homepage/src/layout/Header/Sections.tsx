import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useNavigate, useLocation } from 'react-router-dom'

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
}

const Item: React.FC<IItem> = ({ name }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const pathMap = {
    Home: '/',
    'For Users': '/for-users',
    'For Builders': '/for-builders',
  }

  const routePath = pathMap[name]
  const isSelected = location.pathname === routePath

  const handleItemClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    navigate(routePath)
  }

  return (
    <StyledItem key={name} onClick={handleItemClick} isSelected={isSelected}>
      {name}
    </StyledItem>
  )
}

const ITEMS = [
  { name: 'Home' },
  { name: 'For Users' },
  { name: 'For Builders' },
]

const Sections: React.FC = () => {
  return (
    <Container>
      {ITEMS.map((item) => (
        <Item key={item.name} name={item.name} />
      ))}
    </Container>
  )
}

export default Sections
