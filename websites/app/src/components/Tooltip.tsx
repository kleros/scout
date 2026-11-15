import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useId } from 'react'
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
  box-shadow: ${({ theme }) => theme.shadowTooltip};
  border: 1px solid ${({ theme }) => theme.stroke};
`

const FOCUSABLE_CHILD = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface TooltipProps {
  'data-tooltip': string
  children: React.ReactNode
  className?: string
  placement?: 'top' | 'bottom'
}

/**
 * Shows `data-tooltip` next to its children on hover, on keyboard focus and on tap, and hides it
 * on Escape. The text is also tied to the trigger with aria-describedby, so screen readers
 * announce it. When the children contain no focusable element, the trigger itself becomes
 * focusable so keyboard users can reach the explanation.
 */
const Tooltip: React.FC<TooltipProps> = ({
  'data-tooltip': text,
  children,
  className,
  placement = 'top',
}) => {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [needsTabStop, setNeedsTabStop] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const descriptionId = `tooltip-${useId().replace(/:/g, '')}`

  // Only add a tab stop when there is nothing focusable inside already; otherwise describe the
  // focusable child, which is what assistive technology announces on focus.
  useLayoutEffect(() => {
    const node = triggerRef.current
    if (!node) return
    const child = node.querySelector<HTMLElement>(FOCUSABLE_CHILD)
    setNeedsTabStop(!child)
    if (!child || !text) return
    const previous = child.getAttribute('aria-describedby')
    const ids = new Set((previous ?? '').split(' ').filter(Boolean))
    ids.add(descriptionId)
    child.setAttribute('aria-describedby', Array.from(ids).join(' '))
    return () => {
      if (previous === null) child.removeAttribute('aria-describedby')
      else child.setAttribute('aria-describedby', previous)
    }
  }, [children, text, descriptionId])

  // Measure and position after the tooltip is in the DOM but before paint.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const padding = 8

    // Vertical: flip below when there is no room above.
    const above = triggerRect.top - 6 - tooltipRect.height
    const below = triggerRect.bottom + 6
    const top =
      placement === 'bottom'
        ? below
        : above < padding
          ? below
          : above

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

  useEffect(() => {
    if (!visible) return
    // Capture phase, and the key is consumed: Escape dismisses an open tooltip first, without
    // also closing a dialog it sits in.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setVisible(false)
    }
    const onScroll = () => setVisible(false)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [visible])

  return (
    <>
      <Trigger
        ref={triggerRef}
        className={className}
        tabIndex={needsTabStop && text ? 0 : undefined}
        aria-describedby={needsTabStop && text ? descriptionId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onTouchStart={show}
      >
        {children}
      </Trigger>
      {/* A hidden element is still read when aria-describedby points at it, but it is never part
          of a label's accessible name nor of the page outside its landmarks. */}
      {text ? (
        <span id={descriptionId} hidden>
          {text}
        </span>
      ) : null}
      {visible &&
        text &&
        createPortal(
          <TooltipBox ref={tooltipRef} style={style} aria-hidden="true">
            {text}
          </TooltipBox>,
          document.body,
        )}
    </>
  )
}

export default Tooltip
