import React from 'react'
import { isSafeNavigationUrl, toNavigationUrl } from 'utils/url-validation'

interface SafeLinkProps {
  url?: string | null
  className?: string
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLElement>
}

const DISABLED_STYLE: React.CSSProperties = {
  cursor: 'not-allowed',
  opacity: 0.5,
}

/**
 * Renders a normal new-tab link when the URL uses a safe (https) protocol.
 * When the URL is unsafe (e.g. javascript:, data:, http:) the content is still
 * shown but as a disabled, non-clickable element with an explanatory tooltip,
 * preventing navigation to attacker-controlled protocols (XSS hardening).
 */
const SafeLink: React.FC<SafeLinkProps> = ({
  url,
  className,
  children,
  onClick,
}) => {
  if (!url) return null

  const navigationUrl = toNavigationUrl(url)

  if (isSafeNavigationUrl(navigationUrl)) {
    return (
      <a
        className={className}
        href={navigationUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {children}
      </a>
    )
  }

  return (
    <span
      className={className}
      style={DISABLED_STYLE}
      title={`This link was flagged as unsafe and has been disabled: "${url}"`}
      onClick={onClick}
    >
      {children}
    </span>
  )
}

export default SafeLink
