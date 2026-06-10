import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { TeamConfig, TeamSide } from '../types/models'
import { useTeamTheme } from '../hooks/useTeamTheme'
import './ScoreHalf.css'

interface ScoreHalfProps {
  side: TeamSide
  team: TeamConfig
  points: number
  setsWon: number
  swapped?: boolean
  isDark: boolean
  finished?: boolean
  /** Compact layout: smaller padding, slightly smaller name, used in landscape phone mode. */
  compact?: boolean
  /** Multiplier for the points number (0.5 – 2). */
  pointsScale?: number
  /** Multiplier for the team name (0.5 – 2). */
  teamNameScale?: number
  /** Multiplier for the sets pill (0.5 – 2). */
  setsScale?: number
  /** Global multiplier applied on top of the three specific scales. */
  globalScale?: number
  onAddPoint: (team: TeamSide) => void
  onSubtractPoint: (team: TeamSide) => void
}

const safeScale = (value: number | undefined, fallback = 1): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return fallback
  }
  return value
}

/* ===== Swipe tunables ===================================================
 * MAX_OFFSET     : maximum vertical travel (px) the card reaches on a
 *                   committed swipe. Kept small so the card never leaves
 *                   the viewport.
 * SWIPE_THRESHOLD: minimum travel (px) required to commit to a +/-.
 * TAP_THRESHOLD  : maximum travel (px) that still counts as a plain tap.
 * JUMP_DURATION  : time (ms) for the quick "kick" from 0 → MAX_OFFSET
 *                   (no overshoot, just a snappy lift).
 * RETURN_DURATION: time (ms) for the return MAX_OFFSET → 0 with a
 *                   springy back-easing (overshoot) so the card looks
 *                   like it bounces against its rest position.
 * ====================================================================== */
const MAX_OFFSET = 40
const SWIPE_THRESHOLD = 60
const TAP_THRESHOLD = 8
const JUMP_DURATION = 90
const RETURN_DURATION = 380

/**
 * M3-themed, gesture-aware scoreboard half.
 *
 * The card is fully visible at all times — it just nudges a few pixels in
 * the swipe direction and bounces back, which doubles as a satisfying
 * confirmation that the score has changed.
 *
 * Gestures:
 *  - Tap (no movement)              → +1 point.
 *  - Swipe up   past the threshold  → +1 point (card lifts ~40px up,
 *                                     then springs back to centre).
 *  - Swipe down past the threshold  → -1 point (card dips ~40px down,
 *                                     then springs back to centre).
 *  - Short drag that doesn't reach  → snap back to centre, no change.
 *  - Arrow keys (a11y)              → +1 / -1.
 *
 * The visual offset is driven by a CSS variable (`--swipe-offset`) so the
 * card follows the finger 1:1 while the gesture is in progress, then
 * animates to its final position via the regular `transform` transition.
 */
export const ScoreHalf = ({
  side,
  team,
  points,
  setsWon,
  swapped = false,
  isDark,
  finished = false,
  compact = false,
  pointsScale = 1,
  teamNameScale = 1,
  setsScale = 1,
  globalScale = 1,
  onAddPoint,
  onSubtractPoint,
}: ScoreHalfProps) => {
  const tokens = useTeamTheme({ prefix: side, color: team.color, isDark })

  // Effective scale per region = specific scale × global scale.
  const effectivePointsScale = safeScale(pointsScale) * safeScale(globalScale)
  const effectiveTeamNameScale = safeScale(teamNameScale) * safeScale(globalScale)
  const effectiveSetsScale = safeScale(setsScale) * safeScale(globalScale)

  // Live vertical offset (px) applied to the card while a gesture is in
  // progress or while the lift / bounce animation is running. 0 = resting.
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // True while the card is on its way *to* the lifted/dipped position
  // (no overshoot, fast easing). False while it springs back (overshoot).
  const [isJumping, setIsJumping] = useState(false)

  // Refs that don't need to trigger a re-render.
  const startYRef = useRef<number | null>(null)
  const isPointerDownRef = useRef(false)
  const jumpTimeoutRef = useRef<number | null>(null)
  const returnTimeoutRef = useRef<number | null>(null)
  // Set to true right before we call onAddPoint/onSubtractPoint from our
  // own animation pipeline. Lets the [points, setsWon] effect ignore the
  // resulting re-render and keep the bounce animation intact.
  const isInternalChangeRef = useRef(false)

  // Clean up any pending animation timeouts on unmount.
  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current !== null) {
        window.clearTimeout(jumpTimeoutRef.current)
      }
      if (returnTimeoutRef.current !== null) {
        window.clearTimeout(returnTimeoutRef.current)
      }
    }
  }, [])

  // If the parent updates the value externally (undo/redo, jump-to in
  // history, set finished, etc.) we just want the card to snap back to
  // its resting position. Internal changes (triggered by a swipe) are
  // flagged and skipped so the bounce animation can play undisturbed.
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false
      return
    }
    if (jumpTimeoutRef.current !== null) {
      window.clearTimeout(jumpTimeoutRef.current)
      jumpTimeoutRef.current = null
    }
    if (returnTimeoutRef.current !== null) {
      window.clearTimeout(returnTimeoutRef.current)
      returnTimeoutRef.current = null
    }
    if (!isPointerDownRef.current) {
      setIsDragging(false)
      setIsJumping(false)
      setOffsetY(0)
    }
  }, [points, setsWon])

  const style: CSSProperties = {
    '--team-color': tokens.container,
    '--team-on': tokens.onContainer,
    '--points-scale': String(effectivePointsScale),
    '--team-name-scale': String(effectiveTeamNameScale),
    '--sets-scale': String(effectiveSetsScale),
    '--swipe-offset': `${offsetY}px`,
    '--swipe-duration': `${RETURN_DURATION}ms`,
    '--swipe-jump-duration': `${JUMP_DURATION}ms`,
  } as CSSProperties

  const className =
    'score-half' +
    (swapped ? ' score-half--swapped' : '') +
    (finished ? ' score-half--finished' : '') +
    (compact ? ' score-half--compact' : '') +
    (isDragging ? ' score-half--dragging' : '') +
    (isJumping ? ' score-half--jumping' : '')

  const clearPending = (): void => {
    if (jumpTimeoutRef.current !== null) {
      window.clearTimeout(jumpTimeoutRef.current)
      jumpTimeoutRef.current = null
    }
    if (returnTimeoutRef.current !== null) {
      window.clearTimeout(returnTimeoutRef.current)
      returnTimeoutRef.current = null
    }
  }

  /**
   * Drive the subtle "lift + bounce" animation. The card moves to
   * `targetOffset` quickly with a snappy easing (no overshoot), dwells
   * there for `holdMs`, then springs back to 0 with an overshoot easing
   * so the user sees a small bounce against the rest position.
   */
  const playBounce = (targetOffset: number, holdMs: number): void => {
    clearPending()
    setIsJumping(true)
    setOffsetY(targetOffset)
    jumpTimeoutRef.current = window.setTimeout(() => {
      jumpTimeoutRef.current = null
      // Flip the easing: now the return trip uses a back-easing curve
      // (see CSS), which produces the visible bounce.
      setIsJumping(false)
      setOffsetY(0)
      returnTimeoutRef.current = window.setTimeout(() => {
        returnTimeoutRef.current = null
      }, RETURN_DURATION)
    }, holdMs)
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    // If a previous gesture is still animating, cancel it and start fresh.
    clearPending()
    isPointerDownRef.current = true
    startYRef.current = event.clientY
    setIsDragging(true)
    setIsJumping(false)
    setOffsetY(0)

    try {
      // Capture so we keep receiving pointermove/pointerup even if the
      // user drags outside the card's bounds.
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* setPointerCapture not supported — pointer events still work
         inside the element, but the user can break the gesture by
         dragging out of the card. Acceptable graceful degradation. */
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current || startYRef.current === null) return
    const deltaY = event.clientY - startYRef.current
    // Clamp to MAX_OFFSET in both directions so the card never leaves
    // the viewport during the drag.
    if (deltaY > MAX_OFFSET) {
      setOffsetY(MAX_OFFSET)
    } else if (deltaY < -MAX_OFFSET) {
      setOffsetY(-MAX_OFFSET)
    } else {
      setOffsetY(deltaY)
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false
    setIsDragging(false)

    const endY = event.clientY
    const startY = startYRef.current ?? endY
    const deltaY = endY - startY
    startYRef.current = null

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* no-op */
    }

    // Plain tap (no meaningful movement) → +1 and snap back to centre.
    if (Math.abs(deltaY) < TAP_THRESHOLD) {
      setOffsetY(0)
      setIsJumping(false)
      isInternalChangeRef.current = true
      onAddPoint(side)
      return
    }

    // Swipe up past the threshold → +1 with a subtle lift + bounce.
    if (deltaY < -SWIPE_THRESHOLD) {
      isInternalChangeRef.current = true
      onAddPoint(side)
      playBounce(-MAX_OFFSET, JUMP_DURATION)
      return
    }

    // Swipe down past the threshold → -1 with a subtle dip + bounce.
    if (deltaY > SWIPE_THRESHOLD) {
      isInternalChangeRef.current = true
      onSubtractPoint(side)
      playBounce(MAX_OFFSET, JUMP_DURATION)
      return
    }

    // Drag started but didn't reach the threshold → spring back, no change.
    setIsJumping(false)
    setOffsetY(0)
  }

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    isPointerDownRef.current = false
    setIsDragging(false)
    startYRef.current = null
    setIsJumping(false)
    setOffsetY(0)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* no-op */
    }
  }

  return (
    <button
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') onAddPoint(side)
        if (event.key === 'ArrowDown') onSubtractPoint(side)
      }}
      aria-label={`${team.name}. Toque o swipe arriba para sumar punto, swipe abajo para restar.`}
      type="button"
    >
      <span className="score-half__name">{team.name}</span>
      <span className="score-half__points" aria-live="polite">
        {points}
      </span>
      <span className="score-half__sets">Sets {setsWon}</span>
    </button>
  )
}
