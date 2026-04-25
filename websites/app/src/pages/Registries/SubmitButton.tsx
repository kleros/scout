import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

const StyledLink = styled(Link)`
  ${baseButtonStyles}
  ${primaryButtonStyles}
  ${hoverShortTransitionTiming}
  font-size: 14px;
  padding: 10px 20px;
  text-decoration: none;
`

interface SubmitButtonProps {
  registryName?: string
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ registryName }) => {
  if (!registryName) return null
  return <StyledLink to={`/${registryName}/submit`}>Submit item</StyledLink>
}

export default SubmitButton
