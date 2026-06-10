import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Switch.
 * Reference: https://m3.material.io/components/switch/overview
 */
export const Switch = ({
  label,
  description,
  id,
  disabled,
  className,
  ...rest
}: SwitchProps) => {
  const generatedId = useId()
  const switchId = id ?? generatedId

  if (!label) {
    return (
      <label
        className={classNames(
          'md-switch',
          disabled && 'md-switch--disabled',
          className,
        )}
      >
        <input {...rest} type="checkbox" id={switchId} disabled={disabled} />
        <span className="md-switch__track" />
        <span className="md-switch__thumb" />
      </label>
    )
  }

  return (
    <label
      className={classNames(
        'md-list-item',
        description ? 'md-list-item--two-line' : 'md-list-item--one-line',
        disabled && 'md-switch--disabled',
        className,
      )}
      htmlFor={switchId}
    >
      <span className="md-list-item__content">
        <span className="md-list-item__headline">{label}</span>
        {description && (
          <span className="md-list-item__supporting">{description}</span>
        )}
      </span>
      <span
        className={classNames('md-switch')}
        style={{ position: 'relative' }}
      >
        <input
          {...rest}
          type="checkbox"
          id={switchId}
          disabled={disabled}
        />
        <span className="md-switch__track" />
        <span className="md-switch__thumb" />
      </span>
    </label>
  )
}
