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
  // Keep the latest `onClose` and `dismissible` in refs so the open/close
  // effect below can read them without depending on them. This is critical:
  // parents (e.g. MatchScreen) re-render every second because of the timer
  // tick and pass a fresh inline `onClose` arrow on each render. If we listed
  // those in the effect deps the effect would re-run on every tick, calling
  // `initial.focus()` again — which the browser turns into an auto-scroll that
  // resets the modal's scroll position and yanks the caret back to the first
  // input. Depending on `[open]` only is the React-recommended pattern for
  // "run this side effect on open/close transitions" and matches the
  // documented intent of focusing the first field exactly when the dialog
  // opens.
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    dismissibleRef.current = dismissible
  }, [dismissible])

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && dismissibleRef.current) {
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKey)
    const initial = backdropRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    initial?.focus()
    return () => {
      document.removeEventListener('keydown', handleKey)
      // Only restore focus if the element we previously captured is still in
      // the document. Some flows unmount the triggering element right after
      // the dialog closes (e.g. switching screens), and trying to focus a
      // detached node would throw.
      const target = previouslyFocused.current
      if (target && document.contains(target)) {
        target.focus()
      }
    }
  }, [open])

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
