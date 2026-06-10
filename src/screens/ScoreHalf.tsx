import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
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
  /**
   * When true the half is non-interactive: tap, swipe, and arrow keys are
   * all ignored. Used while a set has just finished and the user has not
   * yet acknowledged the "set finalizado" dialog, so points from the next
   * set can't sneak in before the dialog is closed.
   */
  locked?: boolean
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

/* ===== Auto-fit helpers ==================================================
 * The three text regions (points number, team name, sets pill) share the
 * available space inside the score-half. We want them to grow as much as
 * possible, with the priority order:
 *   1. points number  → as big as the space allows for two digits ("00")
 *   2. team name      → fill whatever vertical space is left
 *   3. sets pill      → take whatever fits below
 *
 * When the user hasn't touched the manual sliders, the system computes a
 * `base` size for each region and the user's scale just multiplies it
 * (so scale=1 == 100% of the auto-fit, scale=0.5 == half, etc.).
 *
 * The measurement is done against a hidden, absolute-positioned span that
 * inherits the exact typography of the real element (same className), so
 * the result matches what the browser would actually render.
 * ====================================================================== */

interface Measurer {
  measure: (text: string, fontSize: number) => { width: number; height: number }
  destroy: () => void
}

const createMeasurer = (container: HTMLElement, className: string): Measurer => {
  const el = document.createElement('span')
  el.className = className
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.pointerEvents = 'none'
  el.style.left = '0'
  el.style.top = '0'
  el.style.zIndex = '-1'
  el.style.whiteSpace = 'pre'
  container.appendChild(el)
  return {
    measure: (text: string, fontSize: number) => {
      el.style.fontSize = `${fontSize}px`
      el.textContent = text
      return { width: el.offsetWidth, height: el.offsetHeight }
    },
    destroy: () => {
      if (el.parentNode) el.parentNode.removeChild(el)
    },
  }
}

/**
 * Binary-search the largest font-size (in px) that fits `text` inside
 * `maxW × maxH` according to the given measurer. Returns an integer
 * pixel value safe to use as a `font-size`.
 */
const binaryFit = (
  measurer: Measurer,
  text: string,
  maxW: number,
  maxH: number,
  hiCap = 1000,
): number => {
  if (maxW <= 0 || maxH <= 0) return 8
  let low = 8
  let high = Math.max(16, Math.min(hiCap, Math.max(maxW * 2, maxH * 2)))
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const { width, height } = measurer.measure(text, mid)
    if (width <= maxW && height <= maxH) {
      low = mid
    } else {
      high = mid
    }
    if (high - low < 0.5) break
  }
  return Math.max(8, Math.floor(low))
}

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
  locked = false,
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
  const containerRef = useRef<HTMLButtonElement>(null)
  const startYRef = useRef<number | null>(null)
  const isPointerDownRef = useRef(false)
  const jumpTimeoutRef = useRef<number | null>(null)
  const returnTimeoutRef = useRef<number | null>(null)
  // Set to true right before we call onAddPoint/onSubtractPoint from our
  // own animation pipeline. Lets the [points, setsWon] effect ignore the
  // resulting re-render and keep the bounce animation intact.
  const isInternalChangeRef = useRef(false)

  // Auto-fit base sizes (in px) for the three text regions. Computed from
  // the available space inside the card; recomputed whenever the card
  // resizes. The CSS multiplies these by the user scale, so when the user
  // has not touched the sliders (scale=1) the rendering matches the
  // computed base exactly. When they have, the result is `base * scale`.
  const [autoSizes, setAutoSizes] = useState<{ points: number; name: number; sets: number }>({
    points: 0,
    name: 0,
    sets: 0,
  })

  // Measure the card on every resize and compute the three base sizes so
  // each region grows as much as it can without overflowing. Priority:
  // points > name > sets (points gets the leftover room first, then name,
  // then sets takes whatever fits).
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let rafId = 0

    const compute = (): void => {
      if (cancelled) return
      const rect = container.getBoundingClientRect()
      const cs = window.getComputedStyle(container)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      const gap = parseFloat(cs.rowGap || cs.gap || '0') || 8

      const availW = Math.max(0, rect.width - padX)
      const availH = Math.max(0, rect.height - padY)

      // Container is collapsed (e.g. zero-sized during transitions). Skip
      // and let the next resize tick re-run the calculation.
      if (availW < 20 || availH < 20) return

      const pointsMeasurer = createMeasurer(container, 'score-half__points')
      const nameMeasurer = createMeasurer(container, 'score-half__name')
      const setsMeasurer = createMeasurer(container, 'score-half__sets')

      try {
        // 1) Points — highest priority. The "00" string is the widest
        //    two-digit shape the number can take, so sizing to fit "00"
        //    guarantees the number never overflows no matter the score.
        //    We cap the vertical budget at 70% of the card so name + sets
        //    are guaranteed a usable chunk.
        const pointsMaxH = Math.max(40, availH * 0.7)
        const pointsSize = binaryFit(
          pointsMeasurer,
          '00',
          availW,
          pointsMaxH,
          Math.max(800, availW * 2),
        )

        // 2) Name — second priority. The space left after the points
        //    block (its rendered height, not the budget we used above,
        //    since we may have settled for less to leave room below).
        const pointsRenderedH = pointsSize * 0.9 // matches .score-half__points line-height
        const afterPointsH = Math.max(0, availH - pointsRenderedH - gap)
        // Reserve at least 28px + a gap for the sets pill below.
        const nameMaxH = Math.max(20, afterPointsH - 28 - gap)
        const nameSize = binaryFit(nameMeasurer, 'M', availW, nameMaxH, 240)

        // 3) Sets — third priority. Whatever vertical room is left.
        const nameRenderedH = nameSize * 1.2 // title line-height-ish
        const setsMaxH = Math.max(20, afterPointsH - nameRenderedH - gap)
        const setsSize = binaryFit(setsMeasurer, 'M', availW, setsMaxH, 160)

        if (!cancelled) {
          setAutoSizes({ points: pointsSize, name: nameSize, sets: setsSize })
        }
      } finally {
        pointsMeasurer.destroy()
        nameMeasurer.destroy()
        setsMeasurer.destroy()
      }
    }

    compute()
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(compute)
    })
    ro.observe(container)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [compact])

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
    // Base auto-fit sizes. The CSS multiplies them by the scale, so when
    // the user has not edited the sliders (scale=1) the result is exactly
    // the largest size that fits the available space.
    '--auto-points-size': `${autoSizes.points}px`,
    '--auto-name-size': `${autoSizes.name}px`,
    '--auto-sets-size': `${autoSizes.sets}px`,
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
    (isJumping ? ' score-half--jumping' : '') +
    (locked ? ' score-half--locked' : '')

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
    // While locked (e.g. a set just finished and the user has not yet
    // dismissed the "set finalizado" dialog) we must not start a new
    // gesture: the next point would be charged to the *next* set, which
    // is exactly what we're trying to prevent.
    if (locked) return
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
      ref={containerRef}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event) => {
        if (locked) return
        if (event.key === 'ArrowUp') onAddPoint(side)
        if (event.key === 'ArrowDown') onSubtractPoint(side)
      }}
      // `disabled` on a <button> blocks every interaction (clicks, focus,
      // keyboard activation), which is exactly the right semantic while a
      // set is pending acknowledgement. `aria-disabled` mirrors the visual
      // state for assistive tech.
      disabled={locked}
      aria-disabled={locked}
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
