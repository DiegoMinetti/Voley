import type { MatchConfig, TeamConfig, UserSettings } from '../types/models'

export const defaultTeamA: TeamConfig = {
  name: 'Equipo A',
  color: '#0f5ea8',
}

export const defaultTeamB: TeamConfig = {
  name: 'Equipo B',
  color: '#bf3f34',
}

export const defaultUserSettings: UserSettings = {
  darkMode: false,
  vibration: true,
  tapToAdd: false,
  confirmFinish: true,
  showClock: false,
  showTimeoutButtons: false,
  showTimerControls: false,
  pointsScale: 1,
  teamNameScale: 1,
  setsScale: 1,
  globalScale: 1,
  defaultTeamA,
  defaultTeamB,
}

export const defaultMatchConfig: MatchConfig = {
  bestOf: 3,
  pointsPerSet: 25,
  minDifference: 2,
  tieBreakPoints: 15,
  tapToAdd: defaultUserSettings.tapToAdd,
  vibration: defaultUserSettings.vibration,
  confirmFinish: defaultUserSettings.confirmFinish,
  showClock: defaultUserSettings.showClock,
  showTimeoutButtons: defaultUserSettings.showTimeoutButtons,
  showTimerControls: defaultUserSettings.showTimerControls,
}
