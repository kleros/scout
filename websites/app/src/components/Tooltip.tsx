import React, { useState, useRef, useCallback, useLayoutEffect } from 'react'
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
  max-width: min(280px, calc(100vw - 16px));
  line-height: 1.4;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.stroke};
`

interface TooltipProps {
  'data-tooltip': string
  children: React.ReactNode
  className?: string
  placement?: 'top' | 'bottom'
}

const Tooltip: React.FC<TooltipProps> = ({
  'data-tooltip': text,
  children,
  className,
  placement = 'top',
}) => {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Measure and position after the tooltip is in the DOM but before paint.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const padding = 8

    // Vertical
    const top =
      placement === 'bottom'
        ? triggerRect.bottom + 6
        : triggerRect.top - 6 - tooltipRect.height

    // Horizontal: center on trigger, then clamp within viewport
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipRect.width - padding),
    )

    setStyle({ top, left })
  }, [visible, placement])

  const show = useCallback(() => {
    if (!text) return
    setVisible(true)
  }, [text])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <>
      <Trigger
        ref={triggerRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </Trigger>
      {visible &&
        text &&
        createPortal(
          <TooltipBox ref={tooltipRef} style={style}>
            {text}
          </TooltipBox>,
          document.body,
        )}
    </>
  )
}

export default Tooltip
