import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  supportingText?: string
  leadingIcon?: string
  trailingIcon?: ReactNode
  error?: boolean
  value?: string | number
  defaultValue?: string | number
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Material Design 3 Outlined TextField with floating label.
 */
export const TextField = ({
  label,
  supportingText,
  leadingIcon,
  trailingIcon,
  error = false,
  id,
  ...rest
}: TextFieldProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hasValue =
    (rest.value != null && String(rest.value).length > 0) ||
    (rest.defaultValue != null && String(rest.defaultValue).length > 0)

  return (
    <div
      className={cn(
        'md-text-field',
        error && 'md-text-field--error',
        leadingIcon && 'md-text-field--with-leading',
        trailingIcon && 'md-text-field--with-trailing',
        hasValue && 'md-text-field--floated',
      )}
    >
      <div className="md-text-field__field">
        {leadingIcon && (
          <span
            className="md-text-field__leading material-symbols-rounded"
            aria-hidden
          >
            {leadingIcon}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          className="md-text-field__input"
          placeholder=" "
        />
        <label htmlFor={inputId} className="md-text-field__label">
          {label}
        </label>
        {trailingIcon && (
          <span className="md-text-field__trailing">{trailingIcon}</span>
        )}
        <div className="md-text-field__outline" aria-hidden>
          <div className="md-text-field__outline-notch" />
        </div>
      </div>
      {supportingText && (
        <div className="md-text-field__supporting">{supportingText}</div>
      )}
    </div>
  )
}
