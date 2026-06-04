import { type CSSProperties, type PointerEvent, type TouchEvent, useRef } from 'react'
import type { TeamConfig, TeamSide } from '../types/models'

interface ScoreHalfProps {
  side: TeamSide
  team: TeamConfig
  points: number
  setsWon: number
  tapToAdd: boolean
  onAddPoint: (team: TeamSide) => void
  onSubtractPoint: (team: TeamSide) => void
}

export const ScoreHalf = ({
  side,
  team,
  points,
  setsWon,
  tapToAdd,
  onAddPoint,
  onSubtractPoint,
}: ScoreHalfProps) => {
  const startYRef = useRef<number | null>(null)

  const resolveGesture = (endY: number) => {
    if (startYRef.current === null) {
      return
    }

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

    if (tapToAdd) {
      onAddPoint(side)
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') {
      return
    }
    startYRef.current = event.clientY
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') {
      return
    }
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
      className="score-half"
      style={{ '--team-color': team.color } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') {
          onAddPoint(side)
        }
        if (event.key === 'ArrowDown') {
          onSubtractPoint(side)
        }
      }}
      aria-label={`${team.name}. Arriba suma punto, abajo resta punto`}
      type="button"
    >
      <span className="score-number" aria-live="polite">
        {points}
      </span>
      <span className="team-name">{team.name}</span>
      <span className="team-sets">Sets: {setsWon}</span>
    </button>
  )
}
