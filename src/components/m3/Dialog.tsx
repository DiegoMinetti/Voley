import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  icon?: string
  children?: ReactNode
  actions?: ReactNode
  content?: ReactNode
  dismissible?: boolean
}

const classNames = (...names: Array<string | false | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * Material Design 3 Dialog.
 * Reference: https://m3.material.io/components/dialogs/overview
 */
export const Dialog = ({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  content,
  dismissible = true,
}: DialogProps) => {
  const backdropRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    const initial = backdropRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    initial?.focus()
    return () => {
      document.removeEventListener('keydown', handleKey)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose, dismissible])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={backdropRef}
      className={classNames(
        'md-dialog-backdrop',
        open && 'md-dialog-backdrop--open',
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible) {
          onClose()
        }
      }}
      role={open ? 'presentation' : undefined}
      aria-hidden={!open}
    >
      <div
        className="md-dialog"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-labelledby={title ? 'md-dialog-title' : undefined}
        aria-hidden={!open}
      >
        {icon && (
          <div className="md-dialog__icon">
            <Icon name={icon} aria-hidden />
          </div>
        )}
        {title && (
          <h2 id="md-dialog-title" className="md-dialog__headline">
            {title}
          </h2>
        )}
        <div className="md-dialog__content">{content ?? children}</div>
        {actions && <div className="md-dialog__actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}
