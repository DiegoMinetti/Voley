import { cn } from './utils'

export interface NavigationItem {
  key: string
  label: string
  icon: string
  active?: boolean
  badge?: number
  onClick?: () => void
}

interface NavigationBarProps {
  items: NavigationItem[]
  className?: string
}

/**
 * Material Design 3 NavigationBar (bottom).
 * Reference: https://m3.material.io/components/navigation-bar/overview
 */
export const NavigationBar = ({ items, className }: NavigationBarProps) => {
  return (
    <nav
      className={cn('md-navigation-bar', className)}
      aria-label="Navegacion principal"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={cn(
            'md-navigation-bar__item',
            item.active && 'md-navigation-bar__item--active',
          )}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.label}
          onClick={item.onClick}
        >
          <span className="md-navigation-bar__indicator">
            <span className="material-symbols-rounded" aria-hidden>
              {item.icon}
            </span>
          </span>
          <span className="md-navigation-bar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
