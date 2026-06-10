import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  exportMatchesAsCsv,
  exportMatchesAsJson,
  parseImportedMatches,
  triggerDownload,
} from './features/export/formatters'
import { projectMatch } from './features/scoring/projector'
import { defaultMatchConfig, defaultUserSettings } from './storage/defaults'
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

type Screen = 'home' | 'new' | 'match' | 'history' | 'settings'

const initialTeams: Record<TeamSide, TeamConfig> = {
  A: { name: 'Equipo A', color: '#0f5ea8' },
  B: { name: 'Equipo B', color: '#bf3f34' },
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
  const previousSetCountRef = useRef(0)
  const pendingFinishConfirmRef = useRef(false)

  const {
    match: activeMatch,
    setMatch,
    addPoint,
    subtractPoint,
    pushEvent,
    undo,
    redo,
    jumpTo,
    finalize,
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
        // app (e.g. without `showTimeoutButtons`) still get sensible values.
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

  // Detect newly completed sets to show a dialog.
  useEffect(() => {
    if (!projection || !activeMatch) {
      previousSetCountRef.current = 0
      return
    }
    if (projection.completedSets.length > previousSetCountRef.current) {
      const lastSet = projection.completedSets[projection.completedSets.length - 1]
      setSetModal(
        `Set ${lastSet.setNumber} finalizado: ${activeMatch.teams.A.name} ${lastSet.pointsA} - ${lastSet.pointsB} ${activeMatch.teams.B.name}`,
      )
    }
    previousSetCountRef.current = projection.completedSets.length
  }, [projection, activeMatch])

  // Detect match finished.
  useEffect(() => {
    if (!projection || !activeMatch) return
    if (!projection.matchFinished) {
      pendingFinishConfirmRef.current = false
      return
    }
    if (activeMatch.status === 'finished') return
    if (pendingFinishConfirmRef.current) return

    const confirm = (): void => {
      finalize()
      void setActiveMatchId(null)
      pendingFinishConfirmRef.current = false
    }

    if (activeMatch.config.confirmFinish) {
      pendingFinishConfirmRef.current = true
      const ok = window.confirm(
        'Partido finalizado. Deseas cerrar y guardar como terminado?',
      )
      if (ok) {
        confirm()
      } else {
        pendingFinishConfirmRef.current = false
      }
    } else {
      confirm()
    }
  }, [projection, activeMatch, finalize])

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

  const handleToggleFullscreen = useCallback(async (): Promise<void> => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }, [])

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
        pointsScale={settings.pointsScale ?? 1}
        teamNameScale={settings.teamNameScale ?? 1}
        setsScale={settings.setsScale ?? 1}
        globalScale={settings.globalScale ?? 1}
        setModal={setModal}
        onDismissSetModal={() => setSetModal(null)}
        onAddPoint={addPoint}
        onSubtractPoint={subtractPoint}
        onPushEvent={pushEvent}
        onUndo={undo}
        onRedo={redo}
        onJumpTo={jumpTo}
        onExit={() => void handleExitMatch()}
        onToggleFullscreen={() => void handleToggleFullscreen()}
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
      onStartNew={() => setScreen('new')}
      onContinueLast={() => void handleContinueLast()}
      onOpenHistory={() => setScreen('history')}
      onOpenSettings={() => setScreen('settings')}
      onDismissStatus={() => setStatusMessage('')}
    />
  )
}

export default App
