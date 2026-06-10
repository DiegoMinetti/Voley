import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label: ReactNode
  supporting?: ReactNode
  value: number
  min: number
  max: number
  step?: number
  /** Suffix shown next to the numeric value (e.g. "x", "%"). */
  unit?: string
  /** Number of decimal places to display for the value. */
  decimals?: number
  onChange: (value: number) => void
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Slider.
 * Reference: https://m3.material.io/components/sliders/overview
 *
 * Renders an accessible range input styled to M3 guidelines, with a value
 * indicator next to the label. Range is divided into discrete steps so the
 * track + thumb stay aligned with the value bubble.
 */
export const Slider = ({
  label,
  supporting,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  decimals = 2,
  disabled,
  className,
  onChange,
  ...rest
}: SliderProps) => {
  const generatedId = useId()
  const { id: providedId, ...inputRest } = rest
  const id = providedId ?? generatedId

  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const displayValue = clamp(value)
  const formatted =
    unit === '%'
      ? `${Math.round(displayValue * 100)}${unit}`
      : `${displayValue.toFixed(decimals)}${unit}`

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  // Position of the filled portion (0-100) used for the active track colour.
  const range = max - min || 1
  const progress = ((displayValue - min) / range) * 100

  const style = {
    '--slider-progress': `${progress}%`,
  } as CSSProperties

  return (
    <div
      className={classNames(
        'md-slider-row',
        disabled && 'md-slider-row--disabled',
        className,
      )}
    >
      <div className="md-slider-row__label">
        <span className="md-slider-row__headline" id={`${id}-label`}>
          {label}
        </span>
        <span
          className="md-slider-row__value"
          aria-live="polite"
          aria-label={`Valor actual ${formatted}`}
        >
          {formatted}
        </span>
      </div>
      <input
        {...inputRest}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        disabled={disabled}
        onChange={handleChange}
        className="md-slider"
        aria-labelledby={`${id}-label`}
        style={style}
      />
      {supporting && (
        <span className="md-slider-row__supporting">{supporting}</span>
      )}
    </div>
  )
}
