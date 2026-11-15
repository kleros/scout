import { useEffect } from 'react'

export const BASE_TITLE = 'Scout · Kleros'

/**
 * Sets the browser tab title for the current page, as "<title> · Scout · Kleros".
 * Pass undefined (for example while the page's data is loading) to keep the base title.
 * The base title is restored when the page unmounts.
 */
export const useDocumentTitle = (title?: string | null) => {
  useEffect(() => {
    const trimmed = title?.trim()
    document.title = trimmed ? `${trimmed} · ${BASE_TITLE}` : BASE_TITLE
  }, [title])

  useEffect(
    () => () => {
      document.title = BASE_TITLE
    },
    [],
  )
}

export default useDocumentTitle
