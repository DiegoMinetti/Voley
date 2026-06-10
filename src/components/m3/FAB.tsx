import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import './FAB.css'

export type FABSize = 'small' | 'medium' | 'large'
export type FABVariant = 'primary' | 'tonal' | 'surface'

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  label: string
  size?: FABSize
  variant?: FABVariant
  iconOnly?: boolean
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Floating Action Button.
 * Variants: primary, tonal, surface.
 * Sizes: small, medium (default), large.
 */
export const FAB = ({
  icon,
  label,
  size = 'medium',
  variant = 'primary',
  iconOnly = false,
  children,
  className,
  type = 'button',
  ...rest
}: FABProps) => {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={classNames(
        'md-fab',
        `md-fab--${variant}`,
        size !== 'medium' && `md-fab--${size}`,
        iconOnly && 'md-fab--icon-only',
        className,
      )}
    >
      <Icon name={icon} aria-hidden />
      {children && size !== 'small' && !iconOnly && (
        <span className="md-fab__label">{children}</span>
      )}
    </button>
  )
}
