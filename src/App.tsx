import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  exportMatchesAsCsv,
  exportMatchesAsJson,
  parseImportedMatches,
  triggerDownload,
} from './features/export/formatters'
import { projectMatch } from './features/scoring/projector'
import { defaultMatchConfig, defaultTeamA, defaultTeamB, defaultUserSettings } from './storage/defaults'
import {
  getActiveMatchId,
  getMatch,
  getUserSettings,
  importMatches,
  listMatches,
  saveMatch,
  saveUserSettings,
  setActiveMatchId,
} from './storage/db'
import type {
  MatchConfig,
  MatchRecord,
  TeamConfig,
  TeamSide,
  UserSettings,
} from './types/models'
import { useMatchReducer } from './hooks/useMatchReducer'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MatchScreen } from './screens/MatchScreen'
import { NewMatchScreen } from './screens/NewMatchScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type { SizeScaleValues } from './components/SizeSettingsDialog'

type Screen = 'home' | 'new' | 'match' | 'history' | 'settings'

const initialTeams: Record<TeamSide, TeamConfig> = {
  A: { ...defaultTeamA },
  B: { ...defaultTeamB },
}

const createMatch = (
  teamA: TeamConfig,
  teamB: TeamConfig,
  config: MatchConfig,
): MatchRecord => {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'in_progress',
    teams: { A: teamA, B: teamB },
    config,
    events: [],
    cursor: 0,
  }
}

/**
 * Pull the team defaults out of `UserSettings`, falling back to the global
 * defaults when older settings payloads don't include the new fields.
 */
const resolveDefaultTeams = (
  settings: UserSettings,
): Record<TeamSide, TeamConfig> => ({
  A: { ...(settings.defaultTeamA ?? defaultTeamA) },
  B: { ...(settings.defaultTeamB ?? defaultTeamB) },
})

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [ready, setReady] = useState(false)
  const [newMatchTeams, setNewMatchTeams] =
    useState<Record<TeamSide, TeamConfig>>(initialTeams)
  const [newConfig, setNewConfig] = useState<MatchConfig>(defaultMatchConfig)
  const [statusMessage, setStatusMessage] = useState('')
  const [now, setNow] = useState<number>(() => Date.now())
  const [setModal, setSetModal] = useState<string | null>(null)
  // Tracks the set number we have *already* acknowledged via the "set
  // finalizado" dialog. Stored as state (not a ref) so the derivation in
  // `pendingSet` below can read it during render without the React rule
  // against accessing refs in render.
  const [lastShownSetNumber, setLastShownSetNumber] = useState(0)
  // Tracks the in-flight delay between a set finishing and the dialog being
  // shown. We keep a ref so the cleanup function can cancel the pending
  // timeout if the match state changes in the meantime.
  const setModalTimeoutRef = useRef<number | null>(null)

  const {
    match: activeMatch,
    setMatch,
    addPoint: addPointRaw,
    subtractPoint: subtractPointRaw,
    pushEvent,
    undo,
    redo,
    jumpTo,
    finalize,
    updateTeams,
  } = useMatchReducer(null, {
    vibration: settings.vibration,
  })

  const inProgressMatch = useMemo(
    () => matches.find((match) => match.status === 'in_progress'),
    [matches],
  )

  const projection = useMemo(() => {
    if (!activeMatch) return null
    return projectMatch(activeMatch, now)
  }, [activeMatch, now])

  // 1-second tick to refresh timer display.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Load initial data.
  useEffect(() => {
    const load = async (): Promise<void> => {
      const [savedSettings, storedMatches, activeId] = await Promise.all([
        getUserSettings(),
        listMatches(),
        getActiveMatchId(),
      ])

      if (savedSettings) {
        // Merge with defaults so settings stored by older versions of the
        // app (e.g. without `showTimeoutButtons` or `defaultTeamA`/`B`) still
        // get sensible values.
        setSettings({ ...defaultUserSettings, ...savedSettings })
      }

      setMatches(storedMatches)

      if (activeId) {
        const current = await getMatch(activeId)
        if (current) {
          setMatch(current)
          setScreen('match')
        }
      }

      setReady(true)
    }

    void load()
  }, [setMatch])

  // Apply theme based on settings.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light'
    void saveUserSettings(settings)
  }, [settings])

  // Sync match metadata to storage on every change.
  useEffect(() => {
    if (!activeMatch) return
    void saveMatch(activeMatch)
  }, [activeMatch])

  // The most recently completed set whose "set finalizado" dialog we have
  // *not* shown yet. Computed during render (instead of in a useEffect) so
  // the very first render after a set finishes already has the right value,
  // which is critical to avoid a one-frame flicker that would briefly show
  // 0/0 on the scoreboard between the projector resetting the points and
  // the dialog popping up.
  const pendingSet = useMemo(() => {
    if (!projection || !activeMatch) return null
    if (activeMatch.status !== 'in_progress') return null
    if (projection.matchFinished) return null
    if (projection.completedSets.length === 0) return null
    const last = projection.completedSets[projection.completedSets.length - 1]
    // The projector zeroes the in-progress points right after pushing the
    // completed set, so the "we just finished a set and the dialog has not
    // been shown yet" state is exactly: at least one completed set, the
    // match is still in progress, and the live points are 0/0.
    const livePointsAreZero =
      projection.points.A === 0 && projection.points.B === 0
    if (!livePointsAreZero) return null
    if (last.setNumber <= lastShownSetNumber) return null
    return last
  }, [projection, activeMatch, lastShownSetNumber])

  // Synchronize the derived `pendingSet` into the `setModal` state. The
  // derived value is what the scoreboard reads (so it can stay in sync on
  // the first frame), and the state is what the dialog component reads (so
  // the user can dismiss it).
  //
  // setState inside an effect is intentional here: the source of truth is
  // the projection (a derivation of React state) and we are committing its
  // "set just finished" transition into a piece of state that survives
  // across renders so the dialog can stay open.
  useEffect(() => {
    if (setModalTimeoutRef.current !== null) {
      window.clearTimeout(setModalTimeoutRef.current)
      setModalTimeoutRef.current = null
    }
    if (!pendingSet || !activeMatch) return
    const message = `Set ${pendingSet.setNumber} finalizado: ${activeMatch.teams.A.name} ${pendingSet.pointsA} - ${pendingSet.pointsB} ${activeMatch.teams.B.name}`
    // Small delay so the user catches the winning point + the sets counter
    // ticking up before the dialog steals their attention.
    setModalTimeoutRef.current = window.setTimeout(() => {
      setModalTimeoutRef.current = null
      setSetModal(message)
    }, 900)
    return () => {
      if (setModalTimeoutRef.current !== null) {
        window.clearTimeout(setModalTimeoutRef.current)
        setModalTimeoutRef.current = null
      }
    }
  }, [pendingSet, activeMatch])

  // Cleanup the pending "show set modal" timeout on unmount so we never
  // call setState on a torn-down component.
  useEffect(() => {
    return () => {
      if (setModalTimeoutRef.current !== null) {
        window.clearTimeout(setModalTimeoutRef.current)
        setModalTimeoutRef.current = null
      }
    }
  }, [])

  // Centralized "tear down the in-match state" helper. Called both from the
  // auto-finish effect below and from the user-confirmed "finish & save"
  // handler. Centralizing keeps the cleanup in one place so the two paths
  // cannot drift apart over time.
  const finishMatchAndGoHome = useCallback((): void => {
    finalize()
    void setActiveMatchId(null)
    setSetModal(null)
    setLastShownSetNumber(0)
    setScreen('home')
  }, [finalize])

  // Detect match finished. When `confirmFinish` is on, the MatchScreen shows
  // a Material dialog to ask the user whether to close & save, so we stay out
  // of the way here. When it's off, we finalize the match immediately,
  // clear the active match id and jump back to the home screen so the user
  // is not stranded on a frozen "match finished" view.
  //
  // setState inside an effect is the right tool here: we are reacting to a
  // *transition* in the projection (match just finished) and committing the
  // derived side effect (finalize + navigate home). The lint rule does not
  // apply because there is no external system to subscribe to — the
  // projection is itself a derivation of React state.
  useEffect(() => {
    if (!projection || !activeMatch) return
    if (!projection.matchFinished) return
    if (activeMatch.status === 'finished') return
    if (activeMatch.config.confirmFinish) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    finishMatchAndGoHome()
  }, [projection, activeMatch, finishMatchAndGoHome])

  // Called by MatchScreen when the user accepts the "finish & save" dialog.
  // We finalize the match, clear the active id and jump back to the home
  // screen so the flow ends on a screen the user can act on next.
  const handleConfirmFinish = useCallback((): void => {
    finishMatchAndGoHome()
  }, [finishMatchAndGoHome])

  // Called when the user dismisses the "set finalizado" dialog. Once the
  // user has acknowledged the set, the scoreboard can stop showing the
  // stale points and the next point of the new set will start from 0/0.
  const handleDismissSetModal = useCallback((): void => {
    setSetModal(null)
    // Mark the current set as acknowledged so the derived `pendingSet` no
    // longer returns it. If `pendingSet` is null we simply keep the current
    // `lastShownSetNumber` as-is (this can happen if the modal was closed
    // via the X button before the set transitioned to the pending state).
    if (pendingSet) {
      setLastShownSetNumber(pendingSet.setNumber)
    }
  }, [pendingSet])

  // Defence in depth for the "wait for set confirmation" rule: even if a
  // gesture / keyboard event slips through to the reducer (e.g. via the
  // browser's built-in button activation in some edge case), we must not
  // let it count toward the *next* set. The ScoreHalf already renders as
  // `disabled` and bails out of its own handlers when `pendingSet` is set,
  // but blocking it here means the contract is enforced at the data layer
  // too — the event simply never reaches the cursor.
  const addPoint = useCallback(
    (team: TeamSide): void => {
      if (pendingSet) return
      addPointRaw(team)
    },
    [pendingSet, addPointRaw],
  )

  const subtractPoint = useCallback(
    (team: TeamSide): void => {
      if (pendingSet) return
      subtractPointRaw(team)
    },
    [pendingSet, subtractPointRaw],
  )

  const handleStartMatch = useCallback(async (): Promise<void> => {
    const match = createMatch(newMatchTeams.A, newMatchTeams.B, newConfig)
    setMatch(match)
    setMatches((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]))
      map.set(match.id, match)
      return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    })
    await setActiveMatchId(match.id)
    setScreen('match')
  }, [newMatchTeams, newConfig, setMatch])

  const handleContinueLast = useCallback(async (): Promise<void> => {
    if (!inProgressMatch) {
      setStatusMessage('No hay partido en curso para continuar')
      return
    }
    setMatch(inProgressMatch)
    await setActiveMatchId(inProgressMatch.id)
    setScreen('match')
  }, [inProgressMatch, setMatch])

  const handleOpenMatch = useCallback(
    async (id: string): Promise<void> => {
      const match = await getMatch(id)
      if (!match) return
      setMatch(match)
      if (match.status === 'in_progress') {
        await setActiveMatchId(match.id)
      }
      setScreen('match')
    },
    [setMatch],
  )

  const handleExportJson = useCallback((): void => {
    triggerDownload(
      `voley-matches-${Date.now()}.json`,
      exportMatchesAsJson(matches),
      'application/json',
    )
  }, [matches])

  const handleExportCsv = useCallback((): void => {
    triggerDownload(
      `voley-matches-${Date.now()}.csv`,
      exportMatchesAsCsv(matches),
      'text/csv',
    )
  }, [matches])

  const handleImportMatches = useCallback(
    async (file: File | null): Promise<void> => {
      if (!file) return
      const content = await file.text()
      try {
        const imported = parseImportedMatches(content)
        await importMatches(imported)
        const refreshed = await listMatches()
        setMatches(refreshed)
        setStatusMessage(`${imported.length} partido(s) importado(s) correctamente`)
      } catch {
        setStatusMessage('Error al importar: usa un JSON exportado por la app')
      }
    },
    [],
  )

  const handleExitMatch = useCallback(async (): Promise<void> => {
    if (activeMatch && activeMatch.status === 'in_progress') {
      await setActiveMatchId(null)
    }
    setScreen('home')
  }, [activeMatch])

  // Persists size changes triggered from the live scoreboard dialog. Using
  // a dedicated callback keeps the match screen free of `UserSettings` concerns
  // and ensures the new values land in the same store as the rest of the app.
  const handleScalesChange = useCallback((next: SizeScaleValues): void => {
    setSettings((prev) => ({ ...prev, ...next }))
  }, [])

  // Apply team name / color changes that the user made from the live
  // scoreboard. We forward the new pair to the reducer (which owns the
  // match record) so the change is persisted to storage on the next sync.
  const handleTeamsChange = useCallback(
    (next: Record<TeamSide, TeamConfig>): void => {
      updateTeams(next)
    },
    [updateTeams],
  )

  // Reset the "new match" team form to the latest saved defaults and jump to
  // the new-match screen. Tied to the HomeScreen action button.
  const handleStartNew = useCallback((): void => {
    setNewMatchTeams(resolveDefaultTeams(settings))
    setScreen('new')
  }, [settings])

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}
      >
        Cargando...
      </div>
    )
  }

  if (screen === 'new') {
    return (
      <NewMatchScreen
        teams={newMatchTeams}
        config={newConfig}
        onTeamChange={(side, team) =>
          setNewMatchTeams((prev) => ({ ...prev, [side]: team }))
        }
        onConfigChange={setNewConfig}
        onStart={() => void handleStartMatch()}
        onCancel={() => setScreen('home')}
      />
    )
  }

  if (screen === 'match' && activeMatch && projection) {
    return (
      <MatchScreen
        match={activeMatch}
        projection={projection}
        isDark={settings.darkMode}
        showClock={settings.showClock}
        showTimerControls={settings.showTimerControls ?? false}
        pointsScale={settings.pointsScale ?? 1}
        teamNameScale={settings.teamNameScale ?? 1}
        setsScale={settings.setsScale ?? 1}
        globalScale={settings.globalScale ?? 1}
        onScalesChange={handleScalesChange}
        onTeamsChange={handleTeamsChange}
        confirmFinish={activeMatch.config.confirmFinish}
        onConfirmFinish={handleConfirmFinish}
        setModal={setModal}
        pendingSet={pendingSet}
        onDismissSetModal={handleDismissSetModal}
        onAddPoint={addPoint}
        onSubtractPoint={subtractPoint}
        onPushEvent={pushEvent}
        onUndo={undo}
        onRedo={redo}
        onJumpTo={jumpTo}
        onExit={() => void handleExitMatch()}
      />
    )
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        matches={matches}
        statusMessage={statusMessage}
        onOpenMatch={(id) => void handleOpenMatch(id)}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onImport={(file) => void handleImportMatches(file)}
        onDismissStatus={() => setStatusMessage('')}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onChange={(next) => {
          setSettings(next)
          setNewConfig((prev) => ({
            ...prev,
            vibration: next.vibration,
            tapToAdd: next.tapToAdd,
            confirmFinish: next.confirmFinish,
            showClock: next.showClock,
            showTimeoutButtons: next.showTimeoutButtons,
            showTimerControls: next.showTimerControls,
          }))
        }}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <HomeScreen
      hasInProgress={Boolean(inProgressMatch)}
      inProgressMatch={inProgressMatch}
      statusMessage={statusMessage}
      onStartNew={handleStartNew}
      onContinueLast={() => void handleContinueLast()}
      onOpenHistory={() => setScreen('history')}
      onOpenSettings={() => setScreen('settings')}
      onDismissStatus={() => setStatusMessage('')}
    />
  )
}

export default App
