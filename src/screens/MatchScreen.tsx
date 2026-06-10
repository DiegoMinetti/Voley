import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/m3/Button'
import { Dialog } from '../components/m3/Dialog'
import { Divider } from '../components/m3/Divider'
import { Icon } from '../components/m3/Icon'
import { IconButton } from '../components/m3/IconButton'
import { SwapButton } from '../components/m3/SwapButton'
import { TopAppBar } from '../components/m3/TopAppBar'
import { WinnerOverlay } from '../components/WinnerOverlay'
import {
  SizeSettingsDialog,
  type SizeScaleValues,
} from '../components/SizeSettingsDialog'
import { TeamEditDialog } from '../components/TeamEditDialog'
import type {
  CompletedSet,
  MatchEvent,
  MatchProjection,
  MatchRecord,
  TeamConfig,
  TeamSide,
} from '../types/models'
import { formatElapsed } from '../utils/format'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useWakeLock } from '../hooks/useWakeLock'
import { ScoreHalf } from './ScoreHalf'
import './MatchScreen.css'

interface MatchScreenProps {
  match: MatchRecord
  projection: MatchProjection
  isDark: boolean
  showClock: boolean
  /**
   * Whether to render the in-match timer control buttons (play/pause + reset)
   * next to the clock in the top app bar. Independent from `showClock` so the
   * user can opt for a read-only clock or full control.
   */
  showTimerControls: boolean
  pointsScale: number
  teamNameScale: number
  setsScale: number
  globalScale: number
  /** Called whenever the user moves a size slider. Receives the new full set. */
  onScalesChange: (next: SizeScaleValues) => void
  /** Called when the user saves a new name/color for either team. */
  onTeamsChange: (next: Record<TeamSide, TeamConfig>) => void
  /**
   * Whether the user opted in to confirming the match finish (vs. auto-saving
   * the moment the rules detect a winner). When true, we pop a Material
   * dialog on finish asking them to close & save.
   */
  confirmFinish: boolean
  /**
   * Called when the user accepts the "Partido finalizado" dialog. The parent
   * is in charge of finalizing the match record and navigating away.
   */
  onConfirmFinish: () => void
  setModal: string | null
  /**
   * The most recently completed set whose "set finalizado" dialog has not
   * been dismissed yet. While it is non-null the scoreboard keeps showing
   * the winning points of that set (e.g. 25-23) so the user actually sees
   * the point that ended the set, instead of jumping straight to 0/0.
   */
  pendingSet: CompletedSet | null
  onDismissSetModal: () => void
  onAddPoint: (team: TeamSide) => void
  onSubtractPoint: (team: TeamSide) => void
  onPushEvent: (event: MatchEvent) => void
  onUndo: () => void
  onRedo: () => void
  onJumpTo: (cursor: number) => void
  onExit: () => void
}

const describeEvent = (
  event: MatchEvent,
  teams: Record<TeamSide, TeamConfig>,
): { label: string; icon: string } => {
  switch (event.type) {
    case 'POINT_ADD':
      return {
        label: `${teams[event.team].name} +1 punto`,
        icon: 'add_circle',
      }
    case 'POINT_SUBTRACT':
      return {
        label: `${teams[event.team].name} -1 punto`,
        icon: 'remove_circle',
      }
    case 'TIMEOUT':
      return { label: `Timeout ${teams[event.team].name}`, icon: 'pause_circle' }
    case 'SIDE_SWAP':
      return { label: 'Cambio de lados', icon: 'swap_horiz' }
    case 'TIMER_START':
      return { label: 'Cronometro: iniciar/reanudar', icon: 'play_arrow' }
    case 'TIMER_PAUSE':
      return { label: 'Cronometro: pausa', icon: 'pause' }
    case 'TIMER_RESET':
      return { label: 'Cronometro: reinicio', icon: 'restart_alt' }
    default:
      return { label: 'Evento', icon: 'event_note' }
  }
}

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

/**
 * Match screen with three new affordances vs. the prior version:
 *  - Tap on a half always adds a point (no need to opt-in via tapToAdd).
 *  - When the match finishes, a celebration overlay (trophy + "Match Completed")
 *    plays; user can tap to dismiss or it auto-closes after a few seconds.
 *  - On a landscape phone (small height, coarse pointer) we hide every piece
 *    of chrome except the two score halves so the player can use the whole
 *    viewport for tapping.
 *  - The size dialog (text size for points / team name / sets / global) can be
 *    opened directly from the top app bar and updates the scoreboard live.
 *  - The team edit dialog (name + color per side) is also opened from the
 *    top app bar and updates the scoreboard live, no need to exit the match.
 */
export const MatchScreen = ({
  match,
  projection,
  isDark,
  showClock,
  showTimerControls,
  pointsScale,
  teamNameScale,
  setsScale,
  globalScale,
  onScalesChange,
  onTeamsChange,
  confirmFinish,
  onConfirmFinish,
  setModal,
  pendingSet,
  onDismissSetModal,
  onAddPoint,
  onSubtractPoint,
  onPushEvent,
  onUndo,
  onRedo,
  onJumpTo,
  onExit,
}: MatchScreenProps) => {
  const visualSides: TeamSide[] = projection.sidesSwapped ? ['B', 'A'] : ['A', 'B']
  const inProgress = match.status === 'in_progress'
  const isFinished = projection.matchFinished
  const clockRef = useRef<HTMLSpanElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [winnerOverlayOpen, setWinnerOverlayOpen] = useState(false)
  // When the match is finished and `confirmFinish` is on, we open this dialog
  // so the user can decide whether to close & save. Cancelling simply hides
  // the dialog and leaves the match in its current in-progress state.
  const [finishPromptOpen, setFinishPromptOpen] = useState(false)
  // When true, the top app bar and the bottom controls are visible. When
  // false, they are collapsed to 0 height so the two score halves absorb
  // the entire viewport — a focused "points-only" mode. The edge handle
  // (chevron pill straddling the top of the score area) toggles the state.
  const [chromeVisible, setChromeVisible] = useState(true)

  const historyListRef = useRef<HTMLOListElement>(null)

  // Landscape phone (small height + coarse pointer) → strip every piece of
  // chrome except the two score halves so the whole viewport is tappable.
  const isCompact = useMediaQuery(
    '(max-height: 520px) and (orientation: landscape) and (pointer: coarse)',
  )

  const totalEvents = match.events.length
  const canUndo = match.cursor > 0
  const canRedo = match.cursor < totalEvents

  useWakeLock(inProgress)

  // Re-render the clock every second while the match is alive.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (clockRef.current) {
        clockRef.current.textContent = formatElapsed(projection.timerElapsedMs)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [projection.timerElapsedMs])

  // Pop the celebration overlay the moment the match finishes. It only fires
  // on the transition (not on subsequent renders) thanks to the ref guard.
  const finishedRef = useRef<boolean>(isFinished)
  useEffect(() => {
    if (isFinished && !finishedRef.current) {
      setWinnerOverlayOpen(true)
    }
    finishedRef.current = isFinished
  }, [isFinished])

  // When the match finishes while the user opted in to confirmation, open the
  // integrated "Partido finalizado" dialog. We trigger it on the
  // is-finished transition and only while the match is still in progress
  // (re-opening an already-finalized match should not re-prompt).
  const finishPromptShownRef = useRef<boolean>(false)
  useEffect(() => {
    if (!confirmFinish) {
      finishPromptShownRef.current = false
      return
    }
    if (isFinished && inProgress && !finishPromptShownRef.current) {
      setFinishPromptOpen(true)
      finishPromptShownRef.current = true
    }
    if (!isFinished) {
      finishPromptShownRef.current = false
    }
  }, [isFinished, inProgress, confirmFinish])

  const handleAcceptFinish = useCallback((): void => {
    setFinishPromptOpen(false)
    onConfirmFinish()
  }, [onConfirmFinish])

  const handleCancelFinish = useCallback((): void => {
    setFinishPromptOpen(false)
  }, [])

  // Build a stable, descending list (newest first) for the history modal.
  const historyEntries = useMemo(
    () =>
      match.events.map((event, index) => {
        const active = index < match.cursor
        const { label, icon } = describeEvent(event, match.teams)
        return {
          index,
          active,
          label,
          icon,
          timestamp: event.timestamp,
          key: `${event.timestamp}-${index}-${event.type}`,
        }
      }),
    [match.events, match.cursor, match.teams],
  )

  // Auto-scroll the modal list to the active boundary (first undone event)
  // every time the modal opens so the current position is visible.
  useEffect(() => {
    if (!historyOpen) return
    const list = historyListRef.current
    if (!list) return
    const boundary = list.querySelector<HTMLElement>(
      '[data-history-boundary="true"]',
    )
    boundary?.scrollIntoView({ block: 'center' })
  }, [historyOpen])

  const handleSelectEvent = (index: number): void => {
    // Set cursor to index + 1 so the tapped event becomes the last applied one.
    onJumpTo(index + 1)
  }

  const handleTimerToggle = (): void => {
    onPushEvent({
      timestamp: Date.now(),
      type: projection.timerRunning ? 'TIMER_PAUSE' : 'TIMER_START',
    })
  }

  const handleTimerReset = (): void => {
    onPushEvent({ timestamp: Date.now(), type: 'TIMER_RESET' })
  }

  const handleResetScales = useCallback((): void => {
    onScalesChange({
      pointsScale: 1,
      teamNameScale: 1,
      setsScale: 1,
      globalScale: 1,
    })
  }, [onScalesChange])

  const handleSaveTeams = useCallback(
    (next: Record<TeamSide, TeamConfig>): void => {
      onTeamsChange(next)
      setTeamDialogOpen(false)
    },
    [onTeamsChange],
  )

  const sizeValues: SizeScaleValues = {
    pointsScale,
    teamNameScale,
    setsScale,
    globalScale,
  }

  // Toggle the chrome visibility. The pill itself never moves; tapping it
  // simply expands or collapses the top bar / bottom controls. Position,
  // size and chevron orientation are driven entirely by CSS in response
  // to the `match-screen--chrome-hidden` class on the parent.
  const handleChromeToggle = (): void => {
    setChromeVisible((current) => !current)
  }

  return (
    <div
      className={
        'match-screen' +
        (isCompact ? ' match-screen--compact' : '') +
        (!chromeVisible ? ' match-screen--chrome-hidden' : '')
      }
    >
      <TopAppBar
        className="match-screen__top-bar"
        variant="small"
        leading={
          <IconButton
            icon="arrow_back"
            label="Salir del partido"
            variant="standard"
            size="small"
            onClick={onExit}
          />
        }
        headline={
          showClock ? (
            <span className="match-screen__clock" aria-label="Cronometro">
              <span
                className="match-screen__clock-time"
                ref={clockRef}
              >
                {formatElapsed(projection.timerElapsedMs)}
              </span>
              {projection.timerRunning && (
                <span className="match-screen__clock-dot" aria-hidden>
                  ·&nbsp;en curso
                </span>
              )}
            </span>
          ) : (
            <span className="md-sr-only">Partido en curso</span>
          )
        }
        actions={
          <>
            <IconButton
              icon="format_size"
              label="Ajustar tamaños del marcador"
              variant="standard"
              size="small"
              onClick={() => setSizeDialogOpen(true)}
            />
            <Divider className="md-divider--vertical" />
            <IconButton
              icon="group"
              label="Editar equipos"
              variant="standard"
              size="small"
              onClick={() => setTeamDialogOpen(true)}
            />
            {showTimerControls && (
              <>
                <Button
                  variant="text"
                  size="small"
                  icon={projection.timerRunning ? 'pause' : 'play_arrow'}
                  iconOnly
                  aria-label={projection.timerRunning ? 'Pausar cronometro' : 'Iniciar cronometro'}
                  onClick={handleTimerToggle}
                />
                <Button
                  variant="text"
                  size="small"
                  icon="restart_alt"
                  iconOnly
                  aria-label="Reiniciar cronometro"
                  onClick={handleTimerReset}
                />
              </>
            )}
            <Divider className="md-divider--vertical" />
            <IconButton
              icon="undo"
              label="Deshacer"
              variant="standard"
              size="small"
              onClick={onUndo}
              disabled={!canUndo}
            />
            <IconButton
              icon="redo"
              label="Rehacer"
              variant="standard"
              size="small"
              onClick={onRedo}
              disabled={!canRedo}
            />
            <IconButton
              icon="history"
              label="Ver historial"
              variant="standard"
              size="small"
              onClick={() => setHistoryOpen(true)}
            />
          </>
        }
      />

      <div className="match-screen__score">
        {visualSides.map((side) => {
          const isSecond = projection.sidesSwapped
          // While a set is between the projector resetting the points to 0/0
          // and the user dismissing the "set finalizado" dialog, `points` is
          // already 0 but `pendingSet` still holds the value the user just
          // saw (e.g. 25). We forward that snapshot to the scoreboard so it
          // keeps showing the winning point until the dialog is closed.
          // Snapshot is hoisted to a local so TypeScript can narrow the
          // non-null case into the ternary below.
          const snapshot = pendingSet
          const showLastSet = Boolean(
            snapshot && projection.points[side] === 0 && !isFinished,
          )
          const displayPoints = showLastSet && snapshot
            ? side === 'A'
              ? snapshot.pointsA
              : snapshot.pointsB
            : projection.points[side]
          return (
            <ScoreHalf
              key={side}
              side={side}
              team={match.teams[side]}
              points={displayPoints}
              setsWon={projection.setsWon[side]}
              swapped={isSecond}
              isDark={isDark}
              finished={isFinished}
              // Block the half while a set has just finished (its dialog
              // is up) OR while the whole match is over. Otherwise the
              // next tap would be charged to the next set before the
              // user even acknowledged the previous one.
              locked={Boolean(snapshot) || isFinished}
              compact={isCompact}
              pointsScale={pointsScale}
              teamNameScale={teamNameScale}
              setsScale={setsScale}
              globalScale={globalScale}
              onAddPoint={onAddPoint}
              onSubtractPoint={onSubtractPoint}
            />
          )
        })}
        <SwapButton
          className="match-screen__swap-fab"
          label="Intercambiar lados"
          onClick={() =>
            onPushEvent({ timestamp: Date.now(), type: 'SIDE_SWAP' })
          }
        />
      </div>

      {match.config.showTimeoutButtons && (
        <div className="match-screen__controls" role="toolbar" aria-label="Controles del partido">
          <div className="match-screen__control-group">
            <Icon name="pause_circle" />
            <span>{match.teams.A.name}</span>
            <Chip count={projection.timeouts.A} />
          </div>
          <Button
            variant="tonal"
            size="small"
            leadingIcon="add"
            onClick={() =>
              onPushEvent({ timestamp: Date.now(), type: 'TIMEOUT', team: 'A' })
            }
          >
            Timeout A
          </Button>
          <div className="match-screen__control-group">
            <Icon name="pause_circle" />
            <span>{match.teams.B.name}</span>
            <Chip count={projection.timeouts.B} />
          </div>
          <Button
            variant="tonal"
            size="small"
            leadingIcon="add"
            onClick={() =>
              onPushEvent({ timestamp: Date.now(), type: 'TIMEOUT', team: 'B' })
            }
          >
            Timeout B
          </Button>
        </div>
      )}

      <button
        type="button"
        className="match-screen__chrome-toggle"
        onClick={handleChromeToggle}
        aria-label={
          chromeVisible
            ? 'Ocultar barra superior y controles'
            : 'Mostrar barra superior y controles'
        }
        aria-expanded={chromeVisible}
        title={chromeVisible ? 'Ocultar' : 'Mostrar'}
      >
        <Icon name="expand_less" />
      </button>

      <Dialog
        open={Boolean(setModal)}
        onClose={onDismissSetModal}
        title="Set finalizado"
        icon="sports_score"
        actions={
          <Button variant="filled" onClick={onDismissSetModal}>
            Siguiente set
          </Button>
        }
      >
        {setModal}
      </Dialog>

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Historial del partido"
        icon="history"
        actions={
          <>
            <Button
              variant="text"
              onClick={onUndo}
              disabled={!canUndo}
              leadingIcon="undo"
            >
              Deshacer
            </Button>
            <Button
              variant="filled"
              onClick={() => setHistoryOpen(false)}
            >
              Cerrar
            </Button>
          </>
        }
      >
        <div className="match-screen__history-modal" role="region" aria-label="Eventos del partido">
          {historyEntries.length === 0 ? (
            <div className="match-screen__history-empty">
              <Icon name="inbox" />
              <span>Aun no hay eventos registrados.</span>
            </div>
          ) : (
            <>
              <p className="match-screen__history-hint">
                Toca un evento para que el partido vuelva a ese punto. Los
                eventos en gris ya fueron deshechos.
              </p>
              <ol
                ref={historyListRef}
                className="match-screen__history-list"
              >
                {[...historyEntries].reverse().map((entry) => {
                  const isBoundary = entry.index === match.cursor
                  return (
                    <li
                      key={entry.key}
                      className={
                        'match-screen__history-item' +
                        (entry.active
                          ? ' match-screen__history-item--active'
                          : ' match-screen__history-item--undone') +
                        (isBoundary ? ' match-screen__history-item--boundary' : '')
                      }
                      data-history-boundary={isBoundary ? 'true' : undefined}
                    >
                      <button
                        type="button"
                        className="match-screen__history-button"
                        onClick={() => handleSelectEvent(entry.index)}
                        aria-label={`Volver al evento ${entry.index + 1}: ${entry.label}`}
                      >
                        <span className="match-screen__history-icon" aria-hidden>
                          <Icon name={entry.icon} />
                        </span>
                        <span className="match-screen__history-content">
                          <span className="match-screen__history-index">
                            #{entry.index + 1}
                          </span>
                          <span className="match-screen__history-label">
                            {entry.label}
                          </span>
                        </span>
                        <span className="match-screen__history-time">
                          {formatTime(entry.timestamp)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>
      </Dialog>

      <SizeSettingsDialog
        open={sizeDialogOpen}
        values={sizeValues}
        onChange={onScalesChange}
        onReset={handleResetScales}
        onClose={() => setSizeDialogOpen(false)}
      />

      <TeamEditDialog
        open={teamDialogOpen}
        teams={match.teams}
        onSave={handleSaveTeams}
        onClose={() => setTeamDialogOpen(false)}
      />

      <WinnerOverlay
        open={winnerOverlayOpen && isFinished}
        winner={projection.winner}
        teams={match.teams}
        setsWon={projection.setsWon}
        onClose={() => setWinnerOverlayOpen(false)}
      />

      <Dialog
        open={finishPromptOpen}
        onClose={handleCancelFinish}
        title="Partido finalizado"
        icon="emoji_events"
        actions={
          <>
            <Button variant="text" onClick={handleCancelFinish}>
              Cancelar
            </Button>
            <Button
              variant="filled"
              onClick={handleAcceptFinish}
              leadingIcon="check"
            >
              Guardar y salir
            </Button>
          </>
        }
      >
        <p className="match-screen__finish-summary">
          {projection.winner
            ? `${match.teams[projection.winner].name} se llevo el partido ${projection.setsWon[projection.winner]} - ${projection.setsWon[projection.winner === 'A' ? 'B' : 'A']}.`
            : 'El partido llego a su fin.'}
        </p>
        <p className="match-screen__finish-hint">
          Deseas cerrar y guardar como terminado?
        </p>
      </Dialog>
    </div>
  )
}

const Chip = ({ count }: { count: number }) => (
  <span
    style={{
      minWidth: 24,
      padding: '0 8px',
      borderRadius: 'var(--md-sys-shape-corner-full)',
      background: 'var(--md-sys-color-secondary-container)',
      color: 'var(--md-sys-color-on-secondary-container)',
      fontSize: 'var(--md-sys-typescale-label-medium-size)',
      lineHeight: '20px',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    }}
    aria-label={`${count} timeouts`}
  >
    {count}
  </span>
)
