import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/** Dialogs currently open, innermost last. Only the innermost one handles keys. */
const openDialogs: symbol[] = []

const isVisible = (el: HTMLElement) =>
  !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) &&
  getComputedStyle(el).visibility !== 'hidden'

export const getFocusable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible)

/**
 * Focus belongs to us when it is inside the dialog, on the page behind it, or nowhere.
 * Anything else (the wallet modal, which lives outside #app) is left alone.
 */
const focusIsOurs = (node: HTMLElement) => {
  const active = document.activeElement
  if (!active || active === document.body || node.contains(active)) return true
  const app = document.getElementById('app')
  return !!app && app.contains(active)
}

interface UseDialogOptions {
  /** Element to focus when the dialog opens. Defaults to the first focusable element, then the dialog itself. */
  initialFocus?: RefObject<HTMLElement>
  /** Close on Escape (default true). */
  closeOnEscape?: boolean
  /** Give focus back to the element that had it before the dialog opened (default true). */
  restoreFocus?: boolean
}

/**
 * Makes an element behave like a modal dialog for keyboard and screen-reader users:
 * focus moves into it on open, Tab and Shift+Tab stay inside it, Escape closes it,
 * and focus returns to the control that opened it.
 *
 * Spread `dialogProps` on the dialog panel (not on the dimmed backdrop) and give it a name with
 * aria-labelledby (the id of its heading) or aria-label.
 */
export const useDialog = <T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  { initialFocus, closeOnEscape = true, restoreFocus = true }: UseDialogOptions = {},
) => {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = Symbol('dialog')
    openDialogs.push(token)
    const previouslyFocused = document.activeElement as HTMLElement | null

    const frame = requestAnimationFrame(() => {
      const node = ref.current
      if (!node || node.contains(document.activeElement)) return
      const target = initialFocus?.current ?? getFocusable(node)[0] ?? node
      target.focus({ preventScroll: true })
    })

    // Bubble phase, after React's own handlers: a control inside the dialog that uses a key itself
    // (Escape closing an open dropdown, for example) calls preventDefault and keeps the dialog open.
    const onKeyDown = (event: KeyboardEvent) => {
      const node = ref.current
      if (!node || event.defaultPrevented) return
      if (openDialogs[openDialogs.length - 1] !== token || !focusIsOurs(node)) return

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const items = getFocusable(node)
      if (items.length === 0) {
        event.preventDefault()
        node.focus({ preventScroll: true })
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = !!active && node.contains(active)
      if (event.shiftKey && (!inside || active === first || active === node)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      const index = openDialogs.indexOf(token)
      if (index !== -1) openDialogs.splice(index, 1)
      if (restoreFocus && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return {
    ref,
    dialogProps: {
      ref,
      role: 'dialog' as const,
      'aria-modal': true as const,
      tabIndex: -1,
    },
  }
}

export default useDialog
