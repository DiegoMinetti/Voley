import type { ReactNode } from 'react'

export type TopAppBarVariant = 'center-aligned' | 'small' | 'medium' | 'large'

interface TopAppBarProps {
  variant?: TopAppBarVariant
  headline?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 TopAppBar.
 * Reference: https://m3.material.io/components/top-app-bar/overview
 */
export const TopAppBar = ({
  variant = 'small',
  headline,
  leading,
  trailing,
  actions,
  className,
  children,
}: TopAppBarProps) => {
  return (
    <header
      className={classNames(
        'md-top-app-bar',
        `md-top-app-bar--${variant}`,
        className,
      )}
      role="banner"
    >
      {leading}
      {headline && (
        <h1 className="md-top-app-bar__headline">{headline}</h1>
      )}
      {trailing}
      {actions && <div className="md-top-app-bar__actions">{actions}</div>}
      {children}
    </header>
  )
}
