import { type CSSProperties, type PointerEvent, type TouchEvent, useRef } from 'react'
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

/**
 * M3-themed, gesture-aware scoreboard half.
 * - Tap = +1 point (primary action, like the reference app).
 * - Swipe up = +1 point (explicit gesture).
 * - Swipe down = -1 point (intentional correction).
 * - Arrow keys = +/- (a11y).
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
  const startYRef = useRef<number | null>(null)
  const tokens = useTeamTheme({ prefix: side, color: team.color, isDark })

  // Effective scale per region = specific scale × global scale.
  const effectivePointsScale = safeScale(pointsScale) * safeScale(globalScale)
  const effectiveTeamNameScale = safeScale(teamNameScale) * safeScale(globalScale)
  const effectiveSetsScale = safeScale(setsScale) * safeScale(globalScale)

  const style = {
    '--team-color': tokens.container,
    '--team-on': tokens.onContainer,
    '--points-scale': String(effectivePointsScale),
    '--team-name-scale': String(effectiveTeamNameScale),
    '--sets-scale': String(effectiveSetsScale),
  } as CSSProperties

  const resolveGesture = (endY: number) => {
    if (startYRef.current === null) return
    const deltaY = endY - startYRef.current
    startYRef.current = null

    if (deltaY <= -24) {
      onAddPoint(side)
      return
    }
    if (deltaY >= 24) {
      onSubtractPoint(side)
      return
    }
    // Plain tap (no meaningful movement) always counts as +1.
    onAddPoint(side)
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') return
    startYRef.current = event.clientY
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') return
    resolveGesture(event.clientY)
  }

  const onTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    startYRef.current = event.changedTouches[0]?.clientY ?? null
  }

  const onTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    resolveGesture(event.changedTouches[0]?.clientY ?? 0)
  }

  return (
    <button
      className={
        'score-half' +
        (swapped ? ' score-half--swapped' : '') +
        (finished ? ' score-half--finished' : '') +
        (compact ? ' score-half--compact' : '')
      }
      style={style}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
