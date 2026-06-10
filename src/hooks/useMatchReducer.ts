import { useCallback, useEffect, useReducer } from 'react'
import type { MatchEvent, MatchRecord, TeamSide } from '../types/models'

export type MatchAction =
  | { type: 'SET'; record: MatchRecord }
  | { type: 'APPEND'; event: MatchEvent }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'JUMP_TO'; cursor: number }
  | { type: 'FINALIZE' }

const appendEvent = (record: MatchRecord, event: MatchEvent): MatchRecord => {
  const truncated = record.events.slice(0, record.cursor)
  const nextEvents = [...truncated, event]
  return {
    ...record,
    events: nextEvents,
    cursor: nextEvents.length,
    updatedAt: Date.now(),
  }
}

const reducer = (
  state: MatchRecord | null,
  action: MatchAction,
): MatchRecord | null => {
  switch (action.type) {
    case 'SET':
      return action.record
    case 'APPEND':
      return state ? appendEvent(state, action.event) : state
    case 'UNDO': {
      if (!state || state.cursor === 0) return state
      return { ...state, cursor: state.cursor - 1, updatedAt: Date.now() }
    }
    case 'REDO': {
      if (!state || state.cursor >= state.events.length) return state
      return { ...state, cursor: state.cursor + 1, updatedAt: Date.now() }
    }
    case 'JUMP_TO': {
      if (!state) return state
      const clamped = Math.max(0, Math.min(action.cursor, state.events.length))
      if (clamped === state.cursor) return state
      return { ...state, cursor: clamped, updatedAt: Date.now() }
    }
    case 'FINALIZE': {
      return state ? { ...state, status: 'finished', updatedAt: Date.now() } : state
    }
    default:
      return state
  }
}

export interface UseMatchReducerResult {
  match: MatchRecord | null
  setMatch: (record: MatchRecord) => void
  appendEvent: (event: MatchEvent) => void
  addPoint: (team: TeamSide) => void
  subtractPoint: (team: TeamSide) => void
  pushEvent: (event: MatchEvent) => void
  undo: () => void
  redo: () => void
  jumpTo: (cursor: number) => void
  finalize: () => void
  clear: () => void
}

export const useMatchReducer = (
  initial: MatchRecord | null,
  options: {
    onChange?: (record: MatchRecord) => void
    vibration?: boolean
  } = {},
): UseMatchReducerResult => {
  const [state, dispatch] = useReducer(reducer, initial)

  // Sync external -> internal
  useEffect(() => {
    if (initial && (!state || state.id !== initial.id)) {
      dispatch({ type: 'SET', record: initial })
    }
    // We deliberately depend only on `initial` to avoid loops from `state` updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  // Notify external on changes
  useEffect(() => {
    if (state) options.onChange?.(state)
    // We deliberately exclude options from deps to keep behavior stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const setMatch = useCallback((record: MatchRecord) => {
    dispatch({ type: 'SET', record })
  }, [])

  const append = useCallback((event: MatchEvent) => {
    dispatch({ type: 'APPEND', event })
  }, [])

  const pushEvent = useCallback((event: MatchEvent) => {
    dispatch({ type: 'APPEND', event })
  }, [])

  const vibrate = useCallback(() => {
    if (options.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }
  }, [options.vibration])

  const addPoint = useCallback(
    (team: TeamSide) => {
      vibrate()
      dispatch({
        type: 'APPEND',
        event: { timestamp: Date.now(), type: 'POINT_ADD', team },
      })
    },
    [vibrate],
  )

  const subtractPoint = useCallback((team: TeamSide) => {
    dispatch({
      type: 'APPEND',
      event: { timestamp: Date.now(), type: 'POINT_SUBTRACT', team },
    })
  }, [])

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])
  const jumpTo = useCallback(
    (cursor: number) => dispatch({ type: 'JUMP_TO', cursor }),
    [],
  )
  const finalize = useCallback(() => dispatch({ type: 'FINALIZE' }), [])
  const clear = useCallback(() => {
    /* no-op; reset handled by setMatch with null on caller side */
  }, [])

  return {
    match: state,
    setMatch,
    appendEvent: append,
    addPoint,
    subtractPoint,
    pushEvent,
    undo,
    redo,
    jumpTo,
    finalize,
    clear,
  }
}
