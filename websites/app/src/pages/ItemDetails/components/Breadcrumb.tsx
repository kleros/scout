import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex-wrap: wrap;

  a {
    color: ${({ theme }) => theme.secondaryText};
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: ${({ theme }) => theme.primaryText};
    }
  }

  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.secondaryText};
  }

  span {
    color: ${({ theme }) => theme.primaryText};
  }
`

const Separator = styled.span`
  color: ${({ theme }) => theme.secondaryText};
`

interface BreadcrumbProps {
  registryName: string
  itemName: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ registryName, itemName }) => {
  return (
    <BreadcrumbContainer>
      <Link to="/">Home</Link>
      <Separator>/</Separator>
      <Link to={`/registry/${registryName}`}>{registryName}</Link>
      <Separator>/</Separator>
      <span>{itemName}</span>
    </BreadcrumbContainer>
  )
}

export default Breadcrumb
