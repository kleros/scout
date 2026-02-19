import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'

const CopyableWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ButtonWrapper = styled.div`
  position: relative;
  display: inline-flex;
  z-index: 1;
`

const CopyButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const Tooltip = styled.div<{ show: boolean }>`
  position: fixed;
  padding: 8px 12px;
  background: ${({ theme }) => theme.tooltipBackground};
  color: ${({ theme }) => theme.primaryText};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  z-index: 999999;
  box-shadow: ${({ theme }) => theme.shadowTooltip};

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -6px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${({ theme }) => theme.tooltipBackground};
  }
`

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 16" fill="currentColor">
    <path d="M13.7759 2.06066L12.1289 0.439344C11.8431 0.158039 11.4555 2.08024e-06 11.0514 0L5.5873 0C4.74571 0 4.06349 0.671562 4.06349 1.5V3H1.52381C0.682222 3 0 3.67156 0 4.5V14.5C0 15.3284 0.682222 16 1.52381 16H8.63492C9.47651 16 10.1587 15.3284 10.1587 14.5V13H12.6984C13.54 13 14.2222 12.3284 14.2222 11.5V3.12131C14.2222 2.72349 14.0617 2.34196 13.7759 2.06066ZM8.44444 14.5H1.71429C1.66377 14.5 1.61532 14.4802 1.5796 14.4451C1.54388 14.4099 1.52381 14.3622 1.52381 14.3125V4.6875C1.52381 4.63777 1.54388 4.59008 1.5796 4.55492C1.61532 4.51975 1.66377 4.5 1.71429 4.5H4.06349V11.5C4.06349 12.3284 4.74571 13 5.5873 13H8.63492V14.3125C8.63492 14.3622 8.61485 14.4099 8.57913 14.4451C8.54341 14.4802 8.49496 14.5 8.44444 14.5ZM12.5079 11.5H5.77778C5.72726 11.5 5.67881 11.4802 5.64309 11.4451C5.60737 11.4099 5.5873 11.3622 5.5873 11.3125V1.6875C5.5873 1.63777 5.60737 1.59008 5.64309 1.55492C5.67881 1.51975 5.72726 1.5 5.77778 1.5H9.14286V4.25C9.14286 4.66422 9.48397 5 9.90476 5H12.6984V11.3125C12.6984 11.3622 12.6783 11.4099 12.6426 11.4451C12.6069 11.4802 12.5585 11.5 12.5079 11.5ZM12.6984 3.5H10.6667V1.5H10.9724C11.023 1.5 11.0714 1.51975 11.1071 1.55491L12.6426 3.06641C12.6603 3.08382 12.6744 3.10449 12.6839 3.12724C12.6935 3.14999 12.6984 3.17438 12.6984 3.199V3.5Z" />
  </svg>
)

const CopiedIcon = () => (
  <svg viewBox="0 0 16 17" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_13289_179292)">
      <path fillRule="evenodd" clipRule="evenodd" d="M0 8.5C0 4.08214 3.58214 0.5 8 0.5C12.4179 0.5 16 4.08214 16 8.5C16 12.9179 12.4179 16.5 8 16.5C3.58214 16.5 0 12.9179 0 8.5ZM1.35714 8.5C1.35714 12.1679 4.33214 15.1429 8 15.1429C11.6679 15.1429 14.6429 12.1679 14.6429 8.5C14.6429 4.83214 11.6679 1.85714 8 1.85714C4.33214 1.85714 1.35714 4.83214 1.35714 8.5ZM10.5017 5.66016H11.3392C11.4553 5.66016 11.5232 5.7923 11.4535 5.88694L7.6928 11.1012C7.64024 11.1746 7.57095 11.2344 7.49067 11.2756C7.4104 11.3168 7.32145 11.3384 7.2312 11.3384C7.14095 11.3384 7.052 11.3168 6.97172 11.2756C6.89144 11.2344 6.82215 11.1746 6.76959 11.1012L4.54459 8.01551C4.47673 7.92087 4.54459 7.78873 4.66066 7.78873H5.49816C5.68209 7.78873 5.85352 7.87801 5.96066 8.02623L7.23209 9.79051L10.0392 5.89766C10.1464 5.74766 10.3196 5.66016 10.5017 5.66016Z" />
    </g>
    <defs>
      <clipPath id="clip0_13289_179292">
        <rect width="16" height="16" fill="white" transform="translate(0 0.5)" />
      </clipPath>
    </defs>
  </svg>
)

interface CopyableProps {
  children: React.ReactNode
  copyableContent: string
  info?: string
  className?: string
}

const Copyable: React.FC<CopyableProps> = ({
  children,
  copyableContent,
  info = 'Copy',
  className,
}) => {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText(copyableContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
    setShowTooltip(true)
  }

  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showTooltip])

  return (
    <CopyableWrapper className={className}>
      {children}
      <ButtonWrapper
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <CopyButton onClick={handleCopy}>
          {copied ? <CopiedIcon /> : <CopyIcon />}
        </CopyButton>
        <Tooltip
          show={showTooltip}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {copied ? 'Copied!' : info}
        </Tooltip>
      </ButtonWrapper>
    </CopyableWrapper>
  )
}

export default Copyable
