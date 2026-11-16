/**
 * The in-app path of a link to this site (`/tokens/0x…?tab=evidence`), or
 * null. Notification links are built from the site's canonical URL, which
 * may be another of its hosts, so only their path is kept; a path starting
 * with // would lead to another site, so there is none.
 */
export const sitePath = (url: string, origin: string) => {
  try {
    const { pathname, search, hash } = new URL(url, origin)
    return pathname.startsWith('/') && !pathname.startsWith('//')
      ? `${pathname}${search}${hash}`
      : null
  } catch {
    return null
  }
}
