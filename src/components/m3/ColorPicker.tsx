import type { CSSProperties } from 'react'
import { Icon } from './Icon'
import { cn } from './utils'

interface ColorPickerProps {
  label: string
  value: string
  palette: string[]
  onChange: (color: string) => void
}

/**
 * Pick a readable foreground color (black or white) for a swatch based on
 * the brightness of the background. Mirrors the heuristic used in
 * `useTeamTheme` so swatches stay legible on any chosen team color.
 */
const pickOnColor = (hex: string): string => {
  const normalized = hex.replace('#', '')
  if (!/^([0-9a-fA-F]{3}){1,2}$/.test(normalized)) return '#fff'
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1b1b1b' : '#ffffff'
}

/**
 * Material Design 3 color picker that combines a curated swatch palette
 * with a native color well.
 *
 * Layout:
 *   ┌─ swatches row (curated palette) ────────────┐
 *   │ ● ● ● ● ● ● ● ●                              │
 *   └──────────────────────────────────────────────┘
 *   ┌─ visual well (custom color picker) ─────────┐
 *   │ [▢]  Selector visual                          │
 *   │      Elegí un color personalizado            │
 *   └──────────────────────────────────────────────┘
 */
export const ColorPicker = ({ label, value, palette, onChange }: ColorPickerProps) => {
  return (
    <div className="md-color-picker" role="group" aria-label={label}>
      <span className="md-color-picker__label md-typescale-label-large">
        {label}
      </span>

      <div
        className="md-color-picker__swatches"
        aria-label={`Paleta sugerida para ${label}`}
      >
        {palette.map((color) => {
          const selected = value.toLowerCase() === color.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              className={cn(
                'md-color-picker__swatch',
                selected && 'md-color-picker__swatch--selected',
              )}
              style={{ '--swatch-color': color } as CSSProperties}
              onClick={() => onChange(color)}
              aria-label={`Elegir ${color}`}
              aria-pressed={selected}
            />
          )
        })}
      </div>

      <label
        className="md-color-picker__visual"
        style={{ '--swatch-color': value } as CSSProperties}
      >
        <span
          className="md-color-picker__visual-swatch"
          style={{ color: pickOnColor(value) }}
          aria-hidden
        >
          <Icon name="colorize" />
        </span>
        <span className="md-color-picker__visual-text">
          <span className="md-color-picker__visual-label md-typescale-label-medium">
            Selector visual
          </span>
          <span className="md-color-picker__visual-hint md-typescale-body-small">
            Tocá para elegir un color personalizado
          </span>
        </span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Selector visual para ${label}`}
        />
      </label>
    </div>
  )
}
