import type { ButtonHTMLAttributes } from 'react'
import { Button, type ButtonVariant } from './Button'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  label: string
  variant?: IconButtonVariant
  size?: 'small' | 'medium' | 'large'
  filled?: boolean
  selected?: boolean
  error?: boolean
}

const mapVariant = (v: IconButtonVariant): ButtonVariant => {
  switch (v) {
    case 'filled':
      return 'filled'
    case 'tonal':
      return 'tonal'
    case 'outlined':
      return 'outlined'
    case 'standard':
    default:
      return 'text'
  }
}

/**
 * Material Design 3 Icon Button.
 * Always requires an accessible label.
 * Variants: standard (transparent), filled, tonal, outlined.
 */
export const IconButton = ({
  icon,
  label,
  variant = 'standard',
  size = 'medium',
  filled = false,
  selected = false,
  error = false,
  ...rest
}: IconButtonProps) => {
  const sizeArg = size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium'

  return (
    <Button
      {...rest}
      variant={mapVariant(variant)}
      size={sizeArg}
      icon={filled ? icon : icon}
      iconOnly
      error={error}
      aria-label={label}
      className={`md-icon-button ${selected ? 'md-icon-button--selected' : ''} ${rest.className ?? ''}`.trim()}
    />
  )
}
