import type { MatchEvent, MatchProjection, MatchRecord } from '../../types/models'
import { getSetTargetPoints, requiredSetsToWin, resolveSetWinner } from './rules'

const formatEvent = (event: MatchEvent, teams: MatchRecord['teams']): string => {
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  switch (event.type) {
    case 'POINT_ADD':
      return `${time} ${teams[event.team].name} +1`
    case 'POINT_SUBTRACT':
      return `${time} ${teams[event.team].name} -1`
    case 'TIMEOUT':
      return `${time} Timeout ${teams[event.team].name}`
    case 'SIDE_SWAP':
      return `${time} Cambio de lados`
    case 'TIMER_START':
      return `${time} Cronometro iniciar/reanudar`
    case 'TIMER_PAUSE':
      return `${time} Cronometro pausa`
    case 'TIMER_RESET':
      return `${time} Cronometro reinicio`
    default:
      return `${time} Evento`
  }
}

export const projectMatch = (
  record: MatchRecord,
  now: number,
): MatchProjection => {
  const projection: MatchProjection = {
    points: { A: 0, B: 0 },
    setsWon: { A: 0, B: 0 },
    completedSets: [],
    timeouts: { A: 0, B: 0 },
    sidesSwapped: false,
    timerElapsedMs: 0,
    timerRunning: false,
    matchFinished: false,
    winner: null,
    history: [],
  }

  const neededSets = requiredSetsToWin(record.config.bestOf)
  let runningSince: number | null = null
  const events = record.events.slice(0, record.cursor)

  for (const event of events) {
    projection.history.push(formatEvent(event, record.teams))

    switch (event.type) {
      case 'POINT_ADD': {
        if (projection.matchFinished) {
          break
        }

        projection.points[event.team] += 1
        const currentSet = projection.completedSets.length + 1
        const targetPoints = getSetTargetPoints(record.config, currentSet)
        const setWinner = resolveSetWinner(
          projection.points.A,
          projection.points.B,
          targetPoints,
          record.config.minDifference,
        )

        if (setWinner) {
          projection.completedSets.push({
            setNumber: currentSet,
            pointsA: projection.points.A,
            pointsB: projection.points.B,
            winner: setWinner,
            targetPoints,
          })
          projection.setsWon[setWinner] += 1

          if (projection.setsWon[setWinner] >= neededSets) {
            projection.matchFinished = true
            projection.winner = setWinner
          } else {
            projection.points = { A: 0, B: 0 }
          }
        }
        break
      }
      case 'POINT_SUBTRACT': {
        if (projection.matchFinished) {
          break
        }

        projection.points[event.team] = Math.max(0, projection.points[event.team] - 1)
        break
      }
      case 'TIMEOUT': {
        projection.timeouts[event.team] += 1
        break
      }
      case 'SIDE_SWAP': {
        projection.sidesSwapped = !projection.sidesSwapped
        break
      }
      case 'TIMER_START': {
        if (runningSince === null) {
          runningSince = event.timestamp
          projection.timerRunning = true
        }
        break
      }
      case 'TIMER_PAUSE': {
        if (runningSince !== null) {
          projection.timerElapsedMs += event.timestamp - runningSince
          runningSince = null
          projection.timerRunning = false
        }
        break
      }
      case 'TIMER_RESET': {
        projection.timerElapsedMs = 0
        runningSince = null
        projection.timerRunning = false
        break
      }
      default:
        break
    }
  }

  if (runningSince !== null) {
    projection.timerElapsedMs += now - runningSince
    projection.timerRunning = true
  }

  return projection
}
