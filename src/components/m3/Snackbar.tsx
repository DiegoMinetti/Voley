import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

interface SnackbarProps {
  open: boolean
  message: ReactNode
  action?: ReactNode
  onClose?: () => void
  durationMs?: number
}

/**
 * Material Design 3 Snackbar.
 * Reference: https://m3.material.io/components/snackbar/overview
 */
export const Snackbar = ({
  open,
  message,
  action,
  onClose,
  durationMs = 4000,
}: SnackbarProps) => {
  useEffect(() => {
    if (!open || !onClose) return
    const id = window.setTimeout(() => onClose(), durationMs)
    return () => window.clearTimeout(id)
  }, [open, durationMs, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn('md-snackbar', open && 'md-snackbar--open')}
      role="status"
      aria-live="polite"
      aria-hidden={!open}
    >
      <span>{message}</span>
      {action && <span className="md-snackbar__action">{action}</span>}
    </div>,
    document.body,
  )
}
