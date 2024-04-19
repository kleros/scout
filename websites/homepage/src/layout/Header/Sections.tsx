import React from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useLocation, useNavigate } from 'react-router-dom'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${responsiveSize(32, 120)};
  position: relative;
  margin-top: 8px;
  align-items: center;

  ${landscapeStyle(
    () => css`
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 0;
    `
  )}
`

const NavbarDecoration = styled.div`
  height: 4px;
  background-color: #cd9dff;
  position: absolute;
  bottom: 0;
  transition: width 0.3s ease, left 0.3s ease;
`

const StyledItem = styled.div<{
  isSelected: boolean
  width?: number
  left?: number
}>`
  text-decoration-color: ${({ isSelected }) =>
    isSelected ? '#CD9DFF' : 'inherit'};
  color: ${({ isSelected }) => (isSelected ? '#CD9DFF' : 'inherit')};
  font-weight: ${({ isSelected }) => (isSelected ? 600 : 400)};
  font-family: 'Oxanium', sans-serif;
  cursor: pointer;
  position: relative;

  &::after {
    display: flex;
    content: ${({ isSelected }) => (isSelected ? '""' : 'none')};
    position: absolute;
    left: -15%;
    bottom: -13px;
    height: 4px;
    background-color: #cd9dff;
    border-radius: 4px 4px 0px 0px;
    width: 132%;
  }

  ${landscapeStyle(
    () => css`
      &::after {
        bottom: -18px;
      }
    `
  )}
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
  const location = useLocation()
  const currentPath = location.pathname

  const decorationStyle = () => {
    const activeItem = ITEMS.find((item) => currentPath.includes(item.path))
    if (!activeItem) return { width: 0, left: 0 }

    const element = document.querySelector(`[data-path="${activeItem.path}"]`)
    return element
      ? { width: element.clientWidth, left: element.offsetLeft }
      : { width: 0, left: 0 }
  }

  return (
    <>
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
      <NavbarDecoration style={decorationStyle()} />
    </>
  )
}

export default Sections
