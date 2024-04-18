import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'

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
  text-decoration-color: ${({ isSelected }) =>
    isSelected ? '#CD9DFF' : 'inherit'};
  color: ${({ isSelected }) => (isSelected ? '#CD9DFF' : 'inherit')};
  font-weight: ${({ isSelected }) => (isSelected ? 600 : 400)};
  font-family: 'Oxanium', sans-serif;
  cursor: pointer;
`

interface IItem {
  name: string
  isSelected: boolean
  onClick: () => void
}

const Item: React.FC<IItem> = ({ name, isSelected, onClick }) => (
  <StyledItem onClick={onClick} isSelected={isSelected}>
    {name}
  </StyledItem>
)

const ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'For Users', path: '/for-users' },
  { name: 'For Builders', path: '/for-builders' },
]

const Sections: React.FC = () => {
  const navigate = useNavigate()
  const currentPath = window.location.hash.replace(/^#/, '') || '/'

  return (
    <Container>
      {ITEMS.map(({ name, path }) => (
        <Item
          key={name}
          name={name}
          isSelected={
            currentPath === path || (currentPath === '/' && path === '/')
          }
          onClick={() => navigate(path)}
        />
      ))}
    </Container>
  )
}

export default Sections
