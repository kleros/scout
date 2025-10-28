import React from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryBlue};
  flex-wrap: wrap;

  a {
    color: ${({ theme }) => theme.secondaryBlue};
    text-decoration: none;
    ${hoverShortTransitionTiming}
    cursor: pointer;

    &:hover {
      color: ${({ theme }) => theme.primaryBlue};
    }
  }

  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.secondaryBlue};
  }

  span {
    color: ${({ theme }) => theme.secondaryBlue};
  }
`

const Separator = styled.span`
  color: ${({ theme }) => theme.secondaryBlue};
`

const StyledLink = styled(Link)`
  /* Inherits styles from BreadcrumbContainer a selector */
`

interface BreadcrumbProps {
  registryName: string
  itemName: string
  registryUrl: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ registryName, itemName, registryUrl }) => {
  const navigate = useNavigate()

  const handleRegistryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if user is trying to open in new tab (Ctrl+Click, Cmd+Click, or middle click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      // Let the default Link behavior handle it (opens in new tab)
      return
    }

    // For normal clicks, navigate to registry page with preserved filters
    e.preventDefault()
    navigate(registryUrl)
  }

  return (
    <BreadcrumbContainer>
      <StyledLink
        to={registryUrl}
        onClick={handleRegistryClick}
      >
        {registryName}
      </StyledLink>
      <Separator>/</Separator>
      <span>{itemName}</span>
    </BreadcrumbContainer>
  )
}

export default Breadcrumb
