import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

const Trigger = styled.span`
  cursor: help;
`

const TooltipBox = styled.div`
  position: fixed;
  z-index: 9999;
  background: ${({ theme }) => theme.backgroundThree};
  color: ${({ theme }) => theme.primaryText};
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  white-space: normal;
  width: max-content;
  max-width: 280px;
  line-height: 1.4;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.stroke};
`

interface TooltipProps {
  'data-tooltip': string
  children: React.ReactNode
  className?: string
}

const Tooltip: React.FC<TooltipProps> = ({ 'data-tooltip': text, children, className }) => {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (!ref.current || !text) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.top - 6, left: rect.left })
    setVisible(true)
  }, [text])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <>
      <Trigger ref={ref} className={className} onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </Trigger>
      {visible &&
        text &&
        createPortal(
          <TooltipBox style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}>
            {text}
          </TooltipBox>,
          document.body
        )}
    </>
  )
}

export default Tooltip
