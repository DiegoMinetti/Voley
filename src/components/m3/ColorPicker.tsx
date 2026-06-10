import type { CSSProperties } from 'react'

interface ColorPickerProps {
  label: string
  value: string
  palette: string[]
  onChange: (color: string) => void
  onCustomHexChange?: (hex: string) => void
  id?: string
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Color picker combining a Material Design 3 swatch palette,
 * a native color input and a hex text field.
 */
export const ColorPicker = ({
  label,
  value,
  palette,
  onChange,
  onCustomHexChange,
  id,
}: ColorPickerProps) => {
  return (
    <div className="md-color-picker">
      <span className="md-color-picker__label md-typescale-label-large">
        {label}
      </span>
      <div
        className="md-color-picker__swatches"
        role="group"
        aria-label={`Paleta de colores para ${label}`}
      >
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            className={classNames(
              'md-color-picker__swatch',
              value.toLowerCase() === color.toLowerCase() &&
                'md-color-picker__swatch--selected',
            )}
            style={{ '--swatch-color': color } as CSSProperties}
            onClick={() => onChange(color)}
            aria-label={`Elegir ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
          />
        ))}
      </div>
      <div className="md-color-picker__custom">
        <label className="md-color-picker__custom-field">
          <span className="md-typescale-label-small">Selector</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`Selector visual para ${label}`}
          />
        </label>
        <label className="md-color-picker__custom-field">
          <span className="md-typescale-label-small">Hex</span>
          <input
            id={id}
            type="text"
            className="md-color-picker__hex"
            value={value}
            onChange={(event) => onCustomHexChange?.(event.target.value)}
            onBlur={(event) => {
              const value = event.target.value.trim()
              if (/^#([0-9a-fA-F]{3}){1,2}$/.test(value)) {
                onChange(value)
              }
            }}
            aria-label={`Codigo hexadecimal para ${label}`}
            placeholder="#6750a4"
          />
        </label>
      </div>
    </div>
  )
}
