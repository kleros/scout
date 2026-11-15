import { useEffect } from 'react'

export const SITE_TITLE = 'Kleros Scout'

/** Sets the tab title to "<title> · Kleros Scout", or "Kleros Scout" when no title is given. */
export const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE
    return () => {
      document.title = SITE_TITLE
    }
  }, [title])
}

export default useDocumentTitle
