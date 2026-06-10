import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant
  selected?: boolean
  leadingIcon?: string
  trailingIcon?: string
  avatar?: ReactNode
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Chip.
 * Reference: https://m3.material.io/components/chips/overview
 */
export const Chip = ({
  variant = 'assist',
  selected = false,
  leadingIcon,
  trailingIcon,
  avatar,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) => {
  const isFilterSelected = variant === 'filter' && selected
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={variant === 'filter' ? selected : undefined}
      className={classNames(
        'md-chip',
        `md-chip--${variant}`,
        isFilterSelected && 'md-chip--filter-selected',
        className,
      )}
    >
      {variant === 'filter' && selected && (
        <span className="md-chip__checkmark material-symbols-rounded" aria-hidden>
          check
        </span>
      )}
      {leadingIcon && !isFilterSelected && (
        <span className="md-chip__avatar material-symbols-rounded" aria-hidden>
          {leadingIcon}
        </span>
      )}
      {avatar}
      {children}
      {trailingIcon && (
        <span className="md-chip__remove material-symbols-rounded" aria-hidden>
          {trailingIcon}
        </span>
      )}
    </button>
  )
}
