import { useEffect, useMemo } from 'react'

export interface TeamColorTokens {
  /** Primary color of the team (raw input). */
  source: string
  /** Container color derived from source. */
  container: string
  /** Color usable on top of the source. */
  on: string
  /** Color usable on top of the container. */
  onContainer: string
}

/**
 * Convert a hex/named color to its RGB equivalent and produce a tonal
 * container + on-color pair using relative luminance.
 * Falls back gracefully when color-mix is unsupported.
 */
const toRgb = (color: string): { r: number; g: number; b: number } | null => {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('')
    }
    if (hex.length !== 6 && hex.length !== 8) return null
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return { r, g, b }
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/i)
  if (match) {
    const [r, g, b] = match[1]
      .split(',')
      .slice(0, 3)
      .map((value) => parseInt(value.trim(), 10))
    if ([r, g, b].some((value) => Number.isNaN(value))) return null
    return { r, g, b }
  }
  return null
}

const toHex = (component: number): string =>
  Math.max(0, Math.min(255, Math.round(component)))
    .toString(16)
    .padStart(2, '0')

const mix = (color: string, other: string, amount: number): string => {
  const a = toRgb(color)
  const b = toRgb(other)
  if (!a || !b) return color
  return `#${[a.r * (1 - amount) + b.r * amount, a.g * (1 - amount) + b.g * amount, a.b * (1 - amount) + b.b * amount]
    .map(toHex)
    .join('')}`
}

const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }): number => {
  const channel = (c: number): number => {
    const value = c / 255
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const deriveTeamTokens = (color: string, isDark: boolean): TeamColorTokens => {
  const container = isDark
    ? mix(color, '#000000', 0.45)
    : mix(color, '#ffffff', 0.78)
  const onContainer = isDark
    ? mix(color, '#ffffff', 0.1)
    : mix(color, '#000000', 0.5)
  const on = relativeLuminance(toRgb(color) ?? { r: 0, g: 0, b: 0 }) > 0.5
    ? '#1d1b20'
    : '#ffffff'
  return { source: color, container, on, onContainer }
}

interface UseTeamThemeOptions {
  prefix: string
  color: string
  isDark: boolean
}

const styleId = (prefix: string): string => `team-theme-${prefix}`

/**
 * Inject a Material-Design 3 style tag with team-specific colors.
 * Cleans up the previous style tag whenever the color/theme changes.
 */
export const useTeamTheme = ({ prefix, color, isDark }: UseTeamThemeOptions): TeamColorTokens => {
  const tokens = useMemo(() => deriveTeamTokens(color, isDark), [color, isDark])

  useEffect(() => {
    const id = styleId(prefix)
    let style = document.getElementById(id) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      :root {
        --md-sys-color-team-${prefix}-source: ${tokens.source};
        --md-sys-color-team-${prefix}-container: ${tokens.container};
        --md-sys-color-team-${prefix}-on: ${tokens.on};
        --md-sys-color-team-${prefix}-on-container: ${tokens.onContainer};
      }
    `
    return () => {
      style?.remove()
    }
  }, [prefix, tokens])

  return tokens
}
