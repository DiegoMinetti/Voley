import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ListItemLines = 1 | 2 | 3

interface BaseListItemProps {
  lines?: ListItemLines
  leading?: ReactNode
  trailing?: ReactNode
  headline: ReactNode
  supporting?: ReactNode
  trailingText?: ReactNode
  disabled?: boolean
  className?: string
}

type ListItemProps = BaseListItemProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 ListItem.
 * Reference: https://m3.material.io/components/lists/overview
 */
export const ListItem = ({
  lines = 1,
  leading,
  trailing,
  headline,
  supporting,
  trailingText,
  disabled = false,
  className,
  type = 'button',
  ...rest
}: ListItemProps) => {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      className={classNames(
        'md-list-item',
        `md-list-item--${lines === 1 ? 'one-line' : lines === 2 ? 'two-line' : 'three-line'}`,
        disabled && 'md-switch--disabled',
        className,
      )}
    >
      {leading && <span className="md-list-item__leading">{leading}</span>}
      <span className="md-list-item__content">
        <span className="md-list-item__headline">{headline}</span>
        {supporting && (
          <span className="md-list-item__supporting">{supporting}</span>
        )}
      </span>
      {(trailingText || trailing) && (
        <span className="md-list-item__trailing">
          {trailingText && (
            <span className="md-list-item__trailing-text">{trailingText}</span>
          )}
          {trailing}
        </span>
      )}
    </button>
  )
}

interface ListProps {
  children: ReactNode
  className?: string
}

export const List = ({ children, className }: ListProps) => (
  <ul className={classNames('md-list', className)}>{children}</ul>
)

export const ListItemDivider = () => <li className="md-divider" />
