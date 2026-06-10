import type { MatchConfig, UserSettings } from '../types/models'

export const defaultUserSettings: UserSettings = {
  darkMode: false,
  vibration: true,
  tapToAdd: false,
  confirmFinish: true,
  showClock: true,
  showTimeoutButtons: false,
  pointsScale: 1,
  teamNameScale: 1,
  setsScale: 1,
  globalScale: 1,
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
}
