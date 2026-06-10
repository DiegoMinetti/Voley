interface DividerProps {
  inset?: boolean
  insetStart?: boolean
  insetEnd?: boolean
  className?: string
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Divider.
 * Reference: https://m3.material.io/components/divider/overview
 */
export const Divider = ({
  inset = false,
  insetStart = false,
  insetEnd = false,
  className,
}: DividerProps) => {
  return (
    <hr
      className={classNames(
        'md-divider',
        inset && 'md-divider--inset',
        insetStart && 'md-divider--inset-start',
        insetEnd && 'md-divider--inset-end',
        className,
      )}
      role="separator"
    />
  )
}
