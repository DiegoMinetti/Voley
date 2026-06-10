export type TeamSide = 'A' | 'B'

export type BestOfSets = 1 | 3 | 5

export interface TeamConfig {
  name: string
  color: string
}

export interface MatchConfig {
  bestOf: BestOfSets
  pointsPerSet: number
  minDifference: number
  tieBreakPoints: number
  tapToAdd: boolean
  vibration: boolean
  confirmFinish: boolean
  showClock: boolean
  /**
   * Whether to show the in-match timeout controls (Timeout A / Timeout B
   * buttons). Optional for backwards compatibility with matches stored
   * before the setting was introduced; missing values default to `false`.
   */
  showTimeoutButtons?: boolean
}

export interface UserSettings {
  darkMode: boolean
  vibration: boolean
  tapToAdd: boolean
  confirmFinish: boolean
  showClock: boolean
  /**
   * Whether to show the in-match timeout controls (Timeout A / Timeout B
   * buttons). Optional for backwards compatibility with stored settings
   * from older app versions; missing values default to `false`.
   */
  showTimeoutButtons?: boolean
  /**
   * Multiplier applied to the points number on the scoreboard half.
   * Range: 0.5 - 2.0. Defaults to 1.
   */
  pointsScale?: number
  /**
   * Multiplier applied to the team name on the scoreboard half.
   * Range: 0.5 - 2.0. Defaults to 1.
   */
  teamNameScale?: number
  /**
   * Multiplier applied to the sets pill on the scoreboard half.
   * Range: 0.5 - 2.0. Defaults to 1.
   */
  setsScale?: number
  /**
   * Multiplier applied on top of the three specific scales (points/team/sets).
   * Lets the user enlarge or shrink the whole scoreboard text in one move.
   * Range: 0.5 - 2.0. Defaults to 1.
   */
  globalScale?: number
}

export type MatchEvent =
  | { timestamp: number; type: 'POINT_ADD'; team: TeamSide }
  | { timestamp: number; type: 'POINT_SUBTRACT'; team: TeamSide }
  | { timestamp: number; type: 'TIMEOUT'; team: TeamSide }
  | { timestamp: number; type: 'TIMER_START' }
  | { timestamp: number; type: 'TIMER_PAUSE' }
  | { timestamp: number; type: 'TIMER_RESET' }
  | { timestamp: number; type: 'SIDE_SWAP' }

export interface MatchRecord {
  id: string
  createdAt: number
  updatedAt: number
  status: 'in_progress' | 'finished'
  teams: Record<TeamSide, TeamConfig>
  config: MatchConfig
  events: MatchEvent[]
  cursor: number
}

export interface CompletedSet {
  setNumber: number
  pointsA: number
  pointsB: number
  winner: TeamSide
  targetPoints: number
}

export interface MatchProjection {
  points: Record<TeamSide, number>
  setsWon: Record<TeamSide, number>
  completedSets: CompletedSet[]
  timeouts: Record<TeamSide, number>
  sidesSwapped: boolean
  timerElapsedMs: number
  timerRunning: boolean
  matchFinished: boolean
  winner: TeamSide | null
  history: string[]
}
