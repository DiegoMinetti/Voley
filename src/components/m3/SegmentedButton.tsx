import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface SegmentedButtonOption<T extends string | number = string> {
  value: T
  label: ReactNode
  icon?: string
  selected?: boolean
}

interface SegmentedButtonSingleProps<T extends string | number = string>
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  value: T
  onChange?: (value: T) => void
  options: Array<SegmentedButtonOption<T>>
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Segmented Button (single-select).
 * Reference: https://m3.material.io/components/segmented-buttons/overview
 */
export const SegmentedButton = <T extends string | number = string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
  ...rest
}: SegmentedButtonSingleProps<T>) => {
  return (
    <div
      className={classNames('md-segmented-buttons', className)}
      role="group"
      aria-label={ariaLabel ?? 'Selector segmentado'}
      {...(rest as object)}
    >
      {options.map((option) => {
        const isSelected = option.selected ?? option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            className={classNames(
              'md-segmented-button',
              isSelected && 'md-segmented-button--selected',
            )}
            aria-pressed={isSelected}
            onClick={() => onChange?.(option.value)}
          >
            {option.icon && (
              <span className="material-symbols-rounded" aria-hidden>
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
