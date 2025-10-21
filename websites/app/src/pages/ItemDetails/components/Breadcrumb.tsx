import React from 'react'
import styled from 'styled-components'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ registryName, itemName }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleRegistryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if user is trying to open in new tab (Ctrl+Click, Cmd+Click, or middle click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      // Let the default Link behavior handle it (opens in new tab)
      return
    }

    // For normal clicks, use smart navigation like Return button
    e.preventDefault()

    // Check if there's a previous page in history by checking location.key
    // If location.key is 'default', it means this is the first page loaded
    const hasHistory = location.key !== 'default'

    if (hasHistory) {
      // Navigate back to previous page if there's history
      navigate(-1)
    } else {
      // Navigate to the registry page if there's no history
      navigate(`/registry/${registryName}`)
    }
  }

  return (
    <BreadcrumbContainer>
      <StyledLink
        to={`/registry/${registryName}`}
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
