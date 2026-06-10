/**
 * Format an elapsed duration (ms) as HH:MM:SS.
 */
export const formatElapsed = (elapsedMs: number): string => {
  const total = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = String(Math.floor(total / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export const formatDateTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString()

export const isValidHexColor = (value: string): boolean =>
  /^#([0-9a-fA-F]{3}){1,2}$/.test(value.trim())
