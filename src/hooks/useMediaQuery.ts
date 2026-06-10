import { useEffect, useState } from 'react'

/**
 * Reactively track a CSS media query.
 * Returns `true` while the query matches, `false` otherwise.
 * SSR-safe: starts with `false` on the server.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches)
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [query])

  return matches
}
