import { describe, expect, it } from 'vitest'
import { defaultMatchConfig } from '../../storage/defaults'
import { getSetTargetPoints, resolveSetWinner } from './rules'

describe('scoring rules', () => {
  it('requires minimum difference to win set', () => {
    expect(resolveSetWinner(25, 24, 25, 2)).toBeNull()
    expect(resolveSetWinner(26, 24, 25, 2)).toBe('A')
  })

  it('uses tie-break points in deciding set', () => {
    const config = { ...defaultMatchConfig, bestOf: 3 as const }
    expect(getSetTargetPoints(config, 1)).toBe(25)
    expect(getSetTargetPoints(config, 3)).toBe(15)
  })
})
