import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  filled?: boolean
  size?: number
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  'aria-hidden'?: boolean
}

/**
 * Material Symbols Rounded icon wrapper.
 * Reference: https://fonts.google.com/icons
 */
export const Icon = ({
  name,
  filled = false,
  size,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
}: IconProps) => {
  const mergedStyle: CSSProperties = size
    ? { fontSize: `${size}px`, ...style }
    : (style ?? {})

  return (
    <span
      className={`material-symbols-rounded${filled ? ' filled' : ''}${className ? ` ${className}` : ''}`}
      style={mergedStyle}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  )
}
