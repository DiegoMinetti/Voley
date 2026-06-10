import { useEffect } from 'react'
import { Icon } from './m3/Icon'
import type { TeamConfig, TeamSide } from '../types/models'
import './WinnerOverlay.css'

interface WinnerOverlayProps {
  /** Whether the overlay should be visible. */
  open: boolean
  /** Winning side, or null while the match is still in progress. */
  winner: TeamSide | null
  /** Winning team config (for color + name) — required when there is a winner. */
  teams: Record<TeamSide, TeamConfig>
  /** Final score lines (e.g. "Sets 3 — 1") to show under the name. */
  setsWon: Record<TeamSide, number>
  onClose: () => void
}

/**
 * Full-screen celebration overlay shown when a match completes.
 * Pure CSS animations: trophy scales in, content fades up, backdrop fades in.
 * Honors `prefers-reduced-motion` to skip the animation gracefully.
 *
 * The parent decides whether to render this component; we just react to `open`.
 */
export const WinnerOverlay = ({
  open,
  winner,
  teams,
  setsWon,
  onClose,
}: WinnerOverlayProps) => {
  // Auto-dismiss the overlay after a few seconds so the user can keep using
  // the app without an extra tap. Long enough to enjoy, short enough to not
  // block the FAB / score view.
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => onClose(), 4500)
    return () => window.clearTimeout(id)
  }, [open, onClose])

  if (!open) return null

  const winnerTeam = winner ? teams[winner] : null
  const losingSide: TeamSide | null =
    winner === 'A' ? 'B' : winner === 'B' ? 'A' : null

  return (
    <div
      className="winner-overlay winner-overlay--open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-overlay-title"
      onClick={onClose}
    >
      <div
        className="winner-overlay__card"
        onClick={(event) => event.stopPropagation()}
        style={
          winnerTeam
            ? ({ '--winner-color': winnerTeam.color } as React.CSSProperties)
            : undefined
        }
      >
        <div className="winner-overlay__trophy" aria-hidden>
          <Icon name="emoji_events" filled size={96} />
        </div>
        <p className="winner-overlay__eyebrow">Match Completed</p>
        <h2 id="winner-overlay-title" className="winner-overlay__name">
          {winnerTeam ? `${winnerTeam.name} gana` : 'Partido finalizado'}
        </h2>
        {winner && losingSide && (
          <p className="winner-overlay__score">
            Sets {setsWon[winner]} — {setsWon[losingSide]}
          </p>
        )}
        <button
          type="button"
          className="winner-overlay__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  )
}
