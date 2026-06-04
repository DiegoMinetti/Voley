import type { MatchConfig, TeamSide } from '../../types/models'

export const requiredSetsToWin = (bestOf: number): number =>
  Math.floor(bestOf / 2) + 1

export const getSetTargetPoints = (
  config: MatchConfig,
  setNumber: number,
): number => {
  const isDecidingSet = config.bestOf > 1 && setNumber === config.bestOf
  return isDecidingSet ? config.tieBreakPoints : config.pointsPerSet
}

export const resolveSetWinner = (
  pointsA: number,
  pointsB: number,
  target: number,
  minDifference: number,
): TeamSide | null => {
  if (pointsA >= target && pointsA - pointsB >= minDifference) {
    return 'A'
  }

  if (pointsB >= target && pointsB - pointsA >= minDifference) {
    return 'B'
  }

  return null
}
