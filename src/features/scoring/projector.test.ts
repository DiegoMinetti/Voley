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
})
