import { describe, expect, it } from 'vitest'
import { projectMatch } from './projector'
import type { MatchRecord } from '../../types/models'
import { defaultMatchConfig } from '../../storage/defaults'

const baseMatch = (): MatchRecord => ({
  id: 'm1',
  createdAt: 1,
  updatedAt: 1,
  status: 'in_progress',
  teams: {
    A: { name: 'A', color: '#000000' },
    B: { name: 'B', color: '#ffffff' },
  },
  config: { ...defaultMatchConfig, bestOf: 3 },
  events: [],
  cursor: 0,
})

describe('projectMatch', () => {
  it('builds score from event sourcing stream', () => {
    const match = baseMatch()
    match.events = [
      { timestamp: 1000, type: 'POINT_ADD', team: 'A' },
      { timestamp: 2000, type: 'POINT_ADD', team: 'B' },
      { timestamp: 3000, type: 'POINT_ADD', team: 'A' },
    ]
    match.cursor = match.events.length

    const projection = projectMatch(match, 3000)
    expect(projection.points.A).toBe(2)
    expect(projection.points.B).toBe(1)
  })

  it('handles tie-break set target at 15 points', () => {
    const match = baseMatch()

    for (let i = 0; i < 25; i += 1) {
      match.events.push({ timestamp: i + 1, type: 'POINT_ADD', team: 'A' })
    }

    for (let i = 0; i < 25; i += 1) {
      match.events.push({ timestamp: i + 30, type: 'POINT_ADD', team: 'B' })
    }

    for (let i = 0; i < 15; i += 1) {
      match.events.push({ timestamp: i + 80, type: 'POINT_ADD', team: 'A' })
    }

    match.cursor = match.events.length

    const projection = projectMatch(match, 1000)
    expect(projection.matchFinished).toBe(true)
    expect(projection.winner).toBe('A')
    expect(projection.completedSets[2].targetPoints).toBe(15)
  })

  it('supports persistent undo/redo cursor semantics', () => {
    const match = baseMatch()
    match.events = [
      { timestamp: 1000, type: 'POINT_ADD', team: 'A' },
      { timestamp: 2000, type: 'POINT_ADD', team: 'A' },
    ]

    match.cursor = 1
    const projection = projectMatch(match, 2000)
    expect(projection.points.A).toBe(1)
  })

  it('caps the score at the configured target so it never goes past the last allowed value', () => {
    const match = baseMatch()
    // Reach 25-25 (deuce scenario) by alternating points.
    for (let i = 0; i < 25; i += 1) {
      match.events.push({ timestamp: i * 2 + 1, type: 'POINT_ADD', team: 'A' })
      match.events.push({ timestamp: i * 2 + 2, type: 'POINT_ADD', team: 'B' })
    }
    // The cap should kick in for any further POINT_ADD events.
    match.events.push({ timestamp: 100, type: 'POINT_ADD', team: 'A' })
    match.events.push({ timestamp: 101, type: 'POINT_ADD', team: 'B' })
    match.cursor = match.events.length

    const projection = projectMatch(match, 1000)
    // The counter must stay at the configured target (25), not go past it.
    expect(projection.points.A).toBe(25)
    expect(projection.points.B).toBe(25)
    // The set is not yet won because the 2-point difference has not been met.
    expect(projection.completedSets.length).toBe(0)
    expect(projection.matchFinished).toBe(false)
  })

  it('prevents the score from going below 0', () => {
    const match = baseMatch()
    match.events = [
      { timestamp: 1000, type: 'POINT_SUBTRACT', team: 'A' },
      { timestamp: 2000, type: 'POINT_SUBTRACT', team: 'A' },
    ]
    match.cursor = match.events.length

    const projection = projectMatch(match, 3000)
    expect(projection.points.A).toBe(0)
    expect(projection.points.B).toBe(0)
  })

  it('still allows a set to be won at the target with the minimum difference', () => {
    const match = baseMatch()
    // A wins 25-23. A scores 2 first, B catches up to 23, A pulls ahead
    // to 25. The set must NOT be won earlier (e.g. at 25-0) so we keep
    // B close to A while A is climbing.
    for (let i = 0; i < 2; i += 1) {
      match.events.push({ timestamp: i + 1, type: 'POINT_ADD', team: 'A' })
    }
    for (let i = 0; i < 23; i += 1) {
      match.events.push({ timestamp: i + 10, type: 'POINT_ADD', team: 'B' })
    }
    for (let i = 0; i < 23; i += 1) {
      match.events.push({ timestamp: i + 50, type: 'POINT_ADD', team: 'A' })
    }
    match.cursor = match.events.length

    const projection = projectMatch(match, 1000)
    // The set was won at 25-23 and the points reset to 0/0 for the next set.
    expect(projection.completedSets.length).toBe(1)
    expect(projection.setsWon.A).toBe(1)
    expect(projection.completedSets[0].pointsA).toBe(25)
    expect(projection.completedSets[0].pointsB).toBe(23)
    expect(projection.points.A).toBe(0)
    expect(projection.points.B).toBe(0)
  })

  it('does not let a point push the score past the target in the current set', () => {
    const match = baseMatch()
    // Bring A to target-1 (24) and B to 0.
    for (let i = 0; i < 24; i += 1) {
      match.events.push({ timestamp: i + 1, type: 'POINT_ADD', team: 'A' })
    }
    match.cursor = match.events.length

    const initial = projectMatch(match, 1000)
    expect(initial.points.A).toBe(24)
    expect(initial.points.B).toBe(0)

    // Tap A: 25-0. Set is won (25 >= 25, diff = 2 >= 2). Reset to 0-0.
    // Tap A again on the NEW set: 1-0 (cap doesn't kick in because 0 < 25).
    match.events.push({ timestamp: 100, type: 'POINT_ADD', team: 'A' })
    match.events.push({ timestamp: 101, type: 'POINT_ADD', team: 'A' })
    match.cursor = match.events.length

    const projection = projectMatch(match, 1000)
    expect(projection.completedSets.length).toBe(1)
    expect(projection.setsWon.A).toBe(1)
    // The new set's counter starts fresh from 0 and the cap is per-set.
    expect(projection.points.A).toBe(1)
    expect(projection.points.B).toBe(0)
  })

  it('does not apply any further POINT_ADD events once the match is finished', () => {
    // The UI blocks taps and the App-level addPoint is a no-op while a
    // set is pending acknowledgement, so the projector should normally
    // never see POINT_ADD events that come in after `matchFinished`
    // flips to true. We still guard inside the projector itself: any
    // such event must be ignored so the score doesn't drift, and the
    // pre-finish state must stay frozen.
    const match = baseMatch()
    // A wins the first two sets back-to-back (25-0, 25-0) → match is
    // finished (best of 3, need 2 sets). The projector does not reset
    // the live points to 0/0 on the final set, so the points reflect
    // the winning score of the last set (25-0).
    for (let i = 0; i < 25; i += 1) {
      match.events.push({ timestamp: i + 1, type: 'POINT_ADD', team: 'A' })
    }
    for (let i = 0; i < 25; i += 1) {
      match.events.push({ timestamp: i + 30, type: 'POINT_ADD', team: 'A' })
    }
    match.cursor = match.events.length

    const finished = projectMatch(match, 1000)
    expect(finished.matchFinished).toBe(true)
    expect(finished.winner).toBe('A')
    expect(finished.setsWon.A).toBe(2)
    expect(finished.points.A).toBe(25)
    expect(finished.points.B).toBe(0)
    expect(finished.completedSets.length).toBe(2)

    // Now feed in extra POINT_ADD events. In a real session the UI/handler
    // would have prevented these from being appended, but the projector
    // is the last line of defence: it must ignore them so the score
    // doesn't change underneath the celebration overlay.
    match.events.push({ timestamp: 200, type: 'POINT_ADD', team: 'A' })
    match.events.push({ timestamp: 201, type: 'POINT_ADD', team: 'B' })
    match.cursor = match.events.length

    const stillFinished = projectMatch(match, 1000)
    expect(stillFinished.matchFinished).toBe(true)
    expect(stillFinished.winner).toBe('A')
    expect(stillFinished.setsWon.A).toBe(2)
    expect(stillFinished.setsWon.B).toBe(0)
    // No further points are charged — the live score stays frozen at 25-0.
    expect(stillFinished.points.A).toBe(25)
    expect(stillFinished.points.B).toBe(0)
    // No phantom "set 3" was created.
    expect(stillFinished.completedSets.length).toBe(2)
  })
})
