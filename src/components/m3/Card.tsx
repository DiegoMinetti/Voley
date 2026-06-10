import type { HTMLAttributes, ReactNode } from 'react'

export type CardVariant = 'elevated' | 'filled' | 'outlined'

interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant
  clickable?: boolean
  as?: 'div' | 'article' | 'button' | 'a'
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Card.
 * Reference: https://m3.material.io/components/cards/overview
 */
export const Card = ({
  variant = 'elevated',
  clickable = false,
  as = 'div',
  className,
  children,
  ...rest
}: CardProps) => {
  const Component = as
  return (
    <Component
      {...rest}
      className={classNames(
        'md-card',
        `md-card--${variant}`,
        clickable && 'md-card--clickable',
        className,
      )}
    >
      {children}
    </Component>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export const CardHeader = ({ className, children, ...rest }: CardHeaderProps) => (
  <div
    {...rest}
    className={classNames('md-card__header', className)}
  >
    {children}
  </div>
)

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export const CardContent = ({ className, children, ...rest }: CardContentProps) => (
  <div
    {...rest}
    className={classNames('md-card__content', className)}
  >
    {children}
  </div>
)

interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export const CardActions = ({ className, children, ...rest }: CardActionsProps) => (
  <div
    {...rest}
    className={classNames('md-card__actions', className)}
  >
    {children}
  </div>
)
