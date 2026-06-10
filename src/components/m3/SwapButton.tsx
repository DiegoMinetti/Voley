import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'
import './SwapButton.css'

interface SwapButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (aria-label). */
  label?: string
  /** Material Symbols icon name. Defaults to "swap_horiz". */
  icon?: string
  /** Visual size of the circular button. */
  size?: 'small' | 'medium' | 'large'
  /** Tonal style — primary uses the primary color, neutral uses surface tint. */
  variant?: 'primary' | 'neutral'
}

/**
 * Material Design 3 — Floating circular button with translucent, "glass" surface.
 *
 * Designed to sit absolutely positioned over content (e.g. between two
 * scoreboard halves) and act as an always-available affordance. The surface
 * uses M3's color-mix transparency plus a backdrop blur to keep the underlying
 * score readable while still feeling layered.
 */
export const SwapButton = ({
  label = 'Intercambiar lados',
  icon = 'swap_horiz',
  size = 'medium',
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: SwapButtonProps) => {
  const classes = [
    'md-swap-button',
    `md-swap-button--${variant}`,
    size !== 'medium' ? `md-swap-button--${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={classes}
    >
      <span className="md-swap-button__icon" aria-hidden>
        <Icon name={icon} />
      </span>
    </button>
  )
}
