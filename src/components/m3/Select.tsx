import { useId, type SelectHTMLAttributes, type ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  supportingText?: string
  options: Array<{ value: string | number; label: string }>
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Outlined Select with floating label.
 */
export const Select = ({
  label,
  supportingText,
  options,
  id,
  value,
  defaultValue,
  ...rest
}: SelectProps) => {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const hasValue =
    (value != null && String(value).length > 0) ||
    (defaultValue != null && String(defaultValue).length > 0)

  return (
    <div
      className={classNames(
        'md-select',
        hasValue && 'md-select--has-value',
      )}
    >
      <div className="md-select__field">
        <select
          {...rest}
          id={selectId}
          value={value}
          defaultValue={defaultValue}
          className="md-select__native"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor={selectId} className="md-select__label">
          {label}
        </label>
        <span className="md-select__chevron material-symbols-rounded" aria-hidden>
          arrow_drop_down
        </span>
        <div className="md-select__outline" aria-hidden />
      </div>
      {supportingText && (
        <div className="md-text-field__supporting">{supportingText}</div>
      )}
    </div>
  )
}
