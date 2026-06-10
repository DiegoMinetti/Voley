import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import './Button.css'

export type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'elevated'

export type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  error?: boolean
  elevated?: boolean
  leadingIcon?: string
  trailingIcon?: string
  iconOnly?: boolean
  icon?: string
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Button.
 * Variants: filled, tonal, outlined, text, elevated.
 */
export const Button = ({
  variant = 'filled',
  size = 'medium',
  fullWidth = false,
  error = false,
  elevated = false,
  leadingIcon,
  trailingIcon,
  iconOnly = false,
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) => {
  const leading = leadingIcon ?? (iconOnly ? icon : undefined)
  const isIconOnly = iconOnly && Boolean(leading)
  const isElevated = elevated || variant === 'elevated'

  return (
    <button
      {...rest}
      type={type}
      className={classNames(
        'md-button',
        `md-button--${variant}`,
        size !== 'medium' && `md-button--${size}`,
        error && 'md-button--error',
        isElevated && 'md-button--elevated',
        fullWidth && 'md-button--full-width',
        isIconOnly && 'md-button--icon-only',
        className,
      )}
    >
      {leading && (
        <Icon
          name={leading}
          className="md-button__icon md-button__icon--leading"
          aria-hidden
        />
      )}
      {children}
      {trailingIcon && (
        <Icon
          name={trailingIcon}
          className="md-button__icon md-button__icon--trailing"
          aria-hidden
        />
      )}
    </button>
  )
}
