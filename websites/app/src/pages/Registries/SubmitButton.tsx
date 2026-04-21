import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  getEffectivePreference,
  useSubmissionPreference,
} from 'hooks/useSubmissionPreference'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

const StyledAnchor = styled.a`
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
  const [, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()
  // Subscribe so this component re-renders if the preference changes elsewhere.
  useSubmissionPreference()

  if (!registryName) return null

  // HASH_ROUTER_HREF: the app uses HashRouter (see src/index.tsx). Absolute
  // `/#/...` keeps the URL clean regardless of current query params. If the
  // app migrates to BrowserRouter, grep this marker to update every call site.
  const submitHref = `/#/${registryName}/submit`

  const openModal = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev.toString())
      next.append('additem', registryName)
      return next
    })
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Modifier / non-primary clicks: let the browser open a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    // Live-read the preference so changes in another tab take effect immediately.
    if (getEffectivePreference(isMobile)) return
    e.preventDefault()
    openModal()
  }

  return (
    <StyledAnchor
      href={submitHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      Submit item
    </StyledAnchor>
  )
}

export default SubmitButton
