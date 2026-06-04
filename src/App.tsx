import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { ScoreHalf } from './components/ScoreHalf'
import { SettingsPanel } from './components/SettingsPanel'
import {
  exportMatchAsJson,
  exportMatchesAsCsv,
  exportMatchesAsJson,
  parseImportedMatches,
  triggerDownload,
} from './features/export/formatters'
import { projectMatch } from './features/scoring/projector'
import { requiredSetsToWin } from './features/scoring/rules'
import { useWakeLock } from './hooks/useWakeLock'
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
  BestOfSets,
  MatchEvent,
  MatchRecord,
  TeamConfig,
  TeamSide,
  UserSettings,
} from './types/models'

type Screen = 'home' | 'new' | 'match' | 'history' | 'settings'
const appIcon = `${import.meta.env.BASE_URL}icon.svg`

const teamColorPalette = [
  '#0f5ea8',
  '#bf3f34',
  '#0e7a4a',
  '#f0a202',
  '#7a2e8b',
  '#1b1b1b',
  '#5f7080',
  '#e0527d',
]

const formatElapsed = (elapsedMs: number): string => {
  const total = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = String(Math.floor(total / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

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

const createMatch = (
  teamA: TeamConfig,
  teamB: TeamConfig,
  config: MatchRecord['config'],
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
  const [activeMatch, setActiveMatch] = useState<MatchRecord | null>(null)
  const [ready, setReady] = useState(false)
  const [newMatchTeams, setNewMatchTeams] = useState<Record<TeamSide, TeamConfig>>({
    A: { name: 'Equipo A', color: '#0f5ea8' },
    B: { name: 'Equipo B', color: '#bf3f34' },
  })
  const [newConfig, setNewConfig] = useState(defaultMatchConfig)
  const [setModal, setSetModal] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [statusMessage, setStatusMessage] = useState('')
  const previousSetCountRef = useRef(0)

  const projection = useMemo(() => {
    if (!activeMatch) {
      return null
    }
    return projectMatch(activeMatch, now)
  }, [activeMatch, now])

  useWakeLock(screen === 'match' && activeMatch?.status === 'in_progress')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const load = async (): Promise<void> => {
      const [savedSettings, storedMatches, activeId] = await Promise.all([
        getUserSettings(),
        listMatches(),
        getActiveMatchId(),
      ])

      if (savedSettings) {
        setSettings(savedSettings)
      }

      setMatches(storedMatches)

      if (activeId) {
        const current = await getMatch(activeId)
        if (current) {
          setActiveMatch(current)
          setScreen('match')
        }
      }

      setReady(true)
    }

    void load()
  }, [])

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

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light'
    void saveUserSettings(settings)
  }, [settings])

  const upsertMatch = (next: MatchRecord): void => {
    setMatches((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]))
      map.set(next.id, next)
      return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    })
    void saveMatch(next)
  }

  const runMatchUpdate = (updater: (record: MatchRecord) => MatchRecord): void => {
    setActiveMatch((previous) => {
      if (!previous) {
        return previous
      }

      const next = updater(previous)
      const projected = projectMatch(next, Date.now())

      if (projected.matchFinished) {
        const shouldFinalize =
          !next.config.confirmFinish ||
          window.confirm('Partido finalizado. Deseas cerrar y guardar como terminado?')

        if (shouldFinalize) {
          next.status = 'finished'
          void setActiveMatchId(null)
        }
      }

      upsertMatch(next)
      return { ...next }
    })
  }

  const fireActionFeedback = (enabled: boolean): void => {
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }
  }

  const addPoint = (team: TeamSide): void => {
    if (!activeMatch) {
      return
    }
    fireActionFeedback(activeMatch.config.vibration)
    runMatchUpdate((record) =>
      appendEvent(record, { timestamp: Date.now(), type: 'POINT_ADD', team }),
    )
  }

  const subtractPoint = (team: TeamSide): void => {
    if (!activeMatch) {
      return
    }

    runMatchUpdate((record) =>
      appendEvent(record, { timestamp: Date.now(), type: 'POINT_SUBTRACT', team }),
    )
  }

  const pushSimpleEvent = (event: MatchEvent): void => {
    runMatchUpdate((record) => appendEvent(record, event))
  }

  const onUndo = (): void => {
    runMatchUpdate((record) => {
      if (record.cursor === 0) {
        return record
      }

      return {
        ...record,
        cursor: record.cursor - 1,
        updatedAt: Date.now(),
      }
    })
  }

  const onRedo = (): void => {
    runMatchUpdate((record) => {
      if (record.cursor >= record.events.length) {
        return record
      }

      return {
        ...record,
        cursor: record.cursor + 1,
        updatedAt: Date.now(),
      }
    })
  }

  const onStartNewMatch = async (): Promise<void> => {
    const match = createMatch(newMatchTeams.A, newMatchTeams.B, newConfig)
    setActiveMatch(match)
    upsertMatch(match)
    await setActiveMatchId(match.id)
    setScreen('match')
  }

  const onContinueLast = async (): Promise<void> => {
    const inProgress = matches.find((match) => match.status === 'in_progress')
    if (!inProgress) {
      setStatusMessage('No hay partido en curso para continuar')
      return
    }

    setActiveMatch(inProgress)
    await setActiveMatchId(inProgress.id)
    setScreen('match')
    setStatusMessage('')
  }

  const onOpenMatch = async (id: string): Promise<void> => {
    const match = await getMatch(id)
    if (!match) {
      return
    }
    setActiveMatch(match)
    if (match.status === 'in_progress') {
      await setActiveMatchId(match.id)
    }
    setScreen('match')
  }

  const onToggleFullscreen = async (): Promise<void> => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }

    await document.exitFullscreen()
  }

  const onImportMatches = async (file: File | null): Promise<void> => {
    if (!file) {
      return
    }

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
  }

  const setTeamColor = (side: TeamSide, color: string): void => {
    setNewMatchTeams((prev) => ({
      ...prev,
      [side]: { ...prev[side], color },
    }))
  }

  if (!ready) {
    return <main className="app-shell loading">Cargando...</main>
  }

  const renderHome = () => (
    <main className="app-shell home-screen">
      <header>
        <h1 className="brand-title">
          <img src={appIcon} alt="Pelota de voley" className="app-icon" />
          Voley Match PWA
        </h1>
        <p>Marcador offline, rapido y listo para partidos reales.</p>
      </header>

      <section className="home-actions">
        <button type="button" onClick={() => setScreen('new')}>
          + Nuevo partido
        </button>
        <button type="button" onClick={() => void onContinueLast()}>
          Continuar ultimo
        </button>
        <button type="button" onClick={() => setScreen('history')}>
          [] Historial
        </button>
        <button type="button" onClick={() => setScreen('settings')}>
          Configuracion
        </button>
      </section>

      {statusMessage && <p className="status-msg">{statusMessage}</p>}
    </main>
  )

  const renderNewMatch = () => (
    <main className="app-shell form-screen">
      <h2 className="brand-title brand-subtitle">
        <img src={appIcon} alt="Pelota de voley" className="app-icon" />
        Nuevo partido
      </h2>

      <section className="form-grid">
        <h3>Equipo A</h3>
        <input
          value={newMatchTeams.A.name}
          onChange={(event) =>
            setNewMatchTeams((prev) => ({
              ...prev,
              A: { ...prev.A, name: event.target.value },
            }))
          }
          placeholder="Nombre equipo A"
        />
        <div className="team-color-editor" role="group" aria-label="Color equipo A">
          <div className="palette-grid">
            {teamColorPalette.map((color) => (
              <button
                key={`A-${color}`}
                type="button"
                className={`palette-swatch ${newMatchTeams.A.color === color ? 'active' : ''}`}
                style={{ '--swatch-color': color } as CSSProperties}
                onClick={() => setTeamColor('A', color)}
                aria-label={`Elegir color ${color} para equipo A`}
              />
            ))}
          </div>
          <div className="color-inputs-row">
            <label>
              Selector
              <input
                type="color"
                value={newMatchTeams.A.color}
                onChange={(event) => setTeamColor('A', event.target.value)}
              />
            </label>
            <label>
              Hex
              <input
                value={newMatchTeams.A.color}
                onChange={(event) => setTeamColor('A', event.target.value)}
                placeholder="#0f5ea8"
              />
            </label>
          </div>
        </div>

        <h3>Equipo B</h3>
        <input
          value={newMatchTeams.B.name}
          onChange={(event) =>
            setNewMatchTeams((prev) => ({
              ...prev,
              B: { ...prev.B, name: event.target.value },
            }))
          }
          placeholder="Nombre equipo B"
        />
        <div className="team-color-editor" role="group" aria-label="Color equipo B">
          <div className="palette-grid">
            {teamColorPalette.map((color) => (
              <button
                key={`B-${color}`}
                type="button"
                className={`palette-swatch ${newMatchTeams.B.color === color ? 'active' : ''}`}
                style={{ '--swatch-color': color } as CSSProperties}
                onClick={() => setTeamColor('B', color)}
                aria-label={`Elegir color ${color} para equipo B`}
              />
            ))}
          </div>
          <div className="color-inputs-row">
            <label>
              Selector
              <input
                type="color"
                value={newMatchTeams.B.color}
                onChange={(event) => setTeamColor('B', event.target.value)}
              />
            </label>
            <label>
              Hex
              <input
                value={newMatchTeams.B.color}
                onChange={(event) => setTeamColor('B', event.target.value)}
                placeholder="#bf3f34"
              />
            </label>
          </div>
        </div>

        <h3>Configuracion</h3>
        <label>
          Mejor de
          <select
            value={newConfig.bestOf}
            onChange={(event) =>
              setNewConfig((prev) => ({
                ...prev,
                bestOf: Number(event.target.value) as BestOfSets,
              }))
            }
          >
            <option value={1}>1 set</option>
            <option value={3}>3 sets</option>
            <option value={5}>5 sets</option>
          </select>
        </label>
        <label>
          Puntos por set
          <input
            type="number"
            min={1}
            value={newConfig.pointsPerSet}
            onChange={(event) =>
              setNewConfig((prev) => ({
                ...prev,
                pointsPerSet: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Diferencia minima
          <input
            type="number"
            min={1}
            value={newConfig.minDifference}
            onChange={(event) =>
              setNewConfig((prev) => ({
                ...prev,
                minDifference: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Puntos tie-break
          <input
            type="number"
            min={1}
            value={newConfig.tieBreakPoints}
            onChange={(event) =>
              setNewConfig((prev) => ({
                ...prev,
                tieBreakPoints: Number(event.target.value),
              }))
            }
          />
        </label>
      </section>

      <section className="inline-actions">
        <button type="button" onClick={() => void onStartNewMatch()}>
          Iniciar partido
        </button>
        <button type="button" className="secondary" onClick={() => setScreen('home')}>
          Volver
        </button>
      </section>
    </main>
  )

  const renderMatch = () => {
    if (!activeMatch || !projection) {
      return renderHome()
    }

    const visualSides: TeamSide[] = projection.sidesSwapped ? ['B', 'A'] : ['A', 'B']
    const neededSets = requiredSetsToWin(activeMatch.config.bestOf)

    return (
      <main className="app-shell match-screen">
        <header className="match-topbar">
          <div className="match-info">
            <img src={appIcon} alt="Pelota de voley" className="app-icon app-icon-small" />
            <strong>
              Sets para ganar: {neededSets} | Resultado: {projection.setsWon.A} -{' '}
              {projection.setsWon.B}
            </strong>
            {activeMatch.config.showClock && (
              <p className="clock">{formatElapsed(projection.timerElapsedMs)}</p>
            )}
          </div>

          <div className="inline-actions">
            <button type="button" className="secondary" onClick={() => onUndo()}>
              ↶ Undo
            </button>
            <button type="button" className="secondary" onClick={() => onRedo()}>
              ↷ Redo
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                pushSimpleEvent({ timestamp: Date.now(), type: 'SIDE_SWAP' })
              }
            >
              Intercambiar lados
            </button>
          </div>
        </header>

        <section className="score-layout">
          {visualSides.map((side) => (
            <ScoreHalf
              key={side}
              side={side}
              team={activeMatch.teams[side]}
              points={projection.points[side]}
              setsWon={projection.setsWon[side]}
              tapToAdd={activeMatch.config.tapToAdd}
              onAddPoint={addPoint}
              onSubtractPoint={subtractPoint}
            />
          ))}
        </section>

        <section className="match-controls">
          <button
            type="button"
            onClick={() =>
              pushSimpleEvent({ timestamp: Date.now(), type: 'TIMEOUT', team: 'A' })
            }
          >
            || {activeMatch.teams.A.name} ({projection.timeouts.A})
          </button>
          <button
            type="button"
            onClick={() =>
              pushSimpleEvent({ timestamp: Date.now(), type: 'TIMEOUT', team: 'B' })
            }
          >
            || {activeMatch.teams.B.name} ({projection.timeouts.B})
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              pushSimpleEvent({ timestamp: Date.now(), type: 'TIMER_START' })
            }
          >
            Iniciar crono
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              pushSimpleEvent({ timestamp: Date.now(), type: 'TIMER_PAUSE' })
            }
          >
            || Pausa
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              pushSimpleEvent({ timestamp: Date.now(), type: 'TIMER_RESET' })
            }
          >
            o Reset
          </button>
          <button type="button" className="secondary" onClick={() => void onToggleFullscreen()}>
            Fullscreen
          </button>
          <button type="button" className="secondary" onClick={() => setScreen('home')}>
            Inicio
          </button>
        </section>

        {activeMatch.config.showLiveHistory && (
          <section className="live-history">
            <h3>Historial en vivo</h3>
            <ul>
              {projection.history
                .slice()
                .reverse()
                .map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
            </ul>
          </section>
        )}

        {setModal && (
          <dialog className="set-modal" open>
            <p>{setModal}</p>
            <button type="button" onClick={() => setSetModal(null)}>
              Siguiente set
            </button>
          </dialog>
        )}
      </main>
    )
  }

  const renderHistory = () => (
    <main className="app-shell history-screen">
      <header className="inline-actions">
        <h2 className="brand-title brand-subtitle">
          <img src={appIcon} alt="Pelota de voley" className="app-icon" />
          Historial de partidos
        </h2>
        <button type="button" className="secondary" onClick={() => setScreen('home')}>
          Volver
        </button>
      </header>

      <section className="inline-actions">
        <button
          type="button"
          onClick={() =>
            triggerDownload(
              `voley-matches-${Date.now()}.json`,
              exportMatchesAsJson(matches),
              'application/json',
            )
          }
        >
          Exportar JSON
        </button>
        <button
          type="button"
          onClick={() =>
            triggerDownload(
              `voley-matches-${Date.now()}.csv`,
              exportMatchesAsCsv(matches),
              'text/csv',
            )
          }
        >
          Exportar CSV
        </button>
        <label className="secondary file-input">
          Importar JSON
          <input
            type="file"
            accept="application/json"
            onChange={(event) => void onImportMatches(event.target.files?.[0] ?? null)}
          />
        </label>
      </section>

      <ul className="history-list">
        {matches.map((match) => {
          const projected = projectMatch(match, match.updatedAt)
          return (
            <li key={match.id}>
              <div>
                <strong>
                  {match.teams.A.name} vs {match.teams.B.name}
                </strong>
                <p>
                  {new Date(match.createdAt).toLocaleString()} | Final:{' '}
                  {projected.setsWon.A}-{projected.setsWon.B} | Duracion:{' '}
                  {formatElapsed(projected.timerElapsedMs)}
                </p>
              </div>

              <div className="inline-actions">
                <button type="button" onClick={() => void onOpenMatch(match.id)}>
                  Abrir
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    triggerDownload(
                      `voley-match-${match.id}.json`,
                      exportMatchAsJson(match),
                      'application/json',
                    )
                  }
                >
                  JSON
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {statusMessage && <p className="status-msg">{statusMessage}</p>}
    </main>
  )

  const renderSettings = () => (
    <main className="app-shell form-screen">
      <h2 className="brand-title brand-subtitle">
        <img src={appIcon} alt="Pelota de voley" className="app-icon" />
        Configuracion
      </h2>
      <SettingsPanel
        settings={settings}
        onChange={(next) => {
          setSettings(next)
          setNewConfig((prev) => ({
            ...prev,
            vibration: next.vibration,
            tapToAdd: next.tapToAdd,
            confirmFinish: next.confirmFinish,
            showClock: next.showClock,
            showLiveHistory: next.showLiveHistory,
          }))
        }}
      />

      <button type="button" className="secondary" onClick={() => setScreen('home')}>
        Volver
      </button>
    </main>
  )

  if (screen === 'new') {
    return renderNewMatch()
  }

  if (screen === 'match') {
    return renderMatch()
  }

  if (screen === 'history') {
    return renderHistory()
  }

  if (screen === 'settings') {
    return renderSettings()
  }

  return renderHome()
}

export default App
