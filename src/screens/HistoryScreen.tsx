import { Button } from '../components/m3/Button'
import { Card, CardActions, CardContent, CardHeader } from '../components/m3/Card'
import { Chip } from '../components/m3/Chip'
import { Icon } from '../components/m3/Icon'
import { IconButton } from '../components/m3/IconButton'
import { Snackbar } from '../components/m3/Snackbar'
import { TopAppBar } from '../components/m3/TopAppBar'
import {
  exportMatchAsJson,
  triggerDownload,
} from '../features/export/formatters'
import { projectMatch } from '../features/scoring/projector'
import type { MatchRecord } from '../types/models'
import { formatDateTime, formatElapsed } from '../utils/format'
import './HistoryScreen.css'

interface HistoryScreenProps {
  matches: MatchRecord[]
  statusMessage: string
  onOpenMatch: (id: string) => void
  onExportJson: () => void
  onExportCsv: () => void
  onImport: (file: File | null) => void
  onDismissStatus: () => void
  onBack: () => void
}

export const HistoryScreen = ({
  matches,
  statusMessage,
  onOpenMatch,
  onExportJson,
  onExportCsv,
  onImport,
  onDismissStatus,
  onBack,
}: HistoryScreenProps) => {
  return (
    <div className="history-screen">
      <TopAppBar
        variant="small"
        headline="Historial"
        leading={
          <IconButton icon="arrow_back" label="Volver" variant="standard" onClick={onBack} />
        }
        actions={
          <IconButton
            icon="file_download"
            label="Exportar todo como JSON"
            variant="standard"
            onClick={onExportJson}
          />
        }
      />

      <div className="history-screen__toolbar" role="toolbar" aria-label="Acciones de historial">
        <Button
          variant="tonal"
          leadingIcon="data_object"
          onClick={onExportJson}
        >
          Exportar JSON
        </Button>
        <Button
          variant="tonal"
          leadingIcon="table_chart"
          onClick={onExportCsv}
        >
          Exportar CSV
        </Button>
        <div className="history-screen__file-input">
          <Button variant="outlined" leadingIcon="file_upload">
            Importar JSON
          </Button>
          <input
            type="file"
            accept="application/json"
            onChange={(event) => onImport(event.target.files?.[0] ?? null)}
            aria-label="Importar archivo JSON"
          />
        </div>
      </div>

      <div className="history-screen__list">
        {matches.length === 0 ? (
          <div className="history-screen__empty">
            <Icon name="inbox" />
            <strong>Aun no hay partidos guardados</strong>
            <span>Inicia uno nuevo para que aparezca aqui.</span>
          </div>
        ) : (
          matches.map((match) => {
            const projection = projectMatch(match, match.updatedAt)
            return (
              <Card key={match.id} variant="elevated" clickable>
                <CardHeader>
                  <div className="history-screen__card-header">
                    <div>
                      <div className="history-screen__teams">
                        {match.teams.A.name} vs {match.teams.B.name}
                      </div>
                      <div className="history-screen__meta">
                        <span>
                          <strong>Fecha:</strong> {formatDateTime(match.createdAt)}
                        </span>
                        <span>
                          <strong>Duracion:</strong> {formatElapsed(projection.timerElapsedMs)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="history-screen__score"
                      aria-label="Resultado final"
                    >
                      {projection.setsWon.A} - {projection.setsWon.B}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="history-screen__meta">
                    <Chip
                      variant={match.status === 'in_progress' ? 'filter' : 'assist'}
                      selected={match.status === 'in_progress'}
                      leadingIcon={
                        match.status === 'in_progress' ? 'play_arrow' : 'emoji_events'
                      }
                    >
                      {match.status === 'in_progress' ? 'En curso' : 'Finalizado'}
                    </Chip>
                    <Chip variant="assist" leadingIcon="scoreboard">
                      Sets {projection.setsWon.A} - {projection.setsWon.B}
                    </Chip>
                    <Chip variant="assist" leadingIcon="schedule">
                      {formatElapsed(projection.timerElapsedMs)}
                    </Chip>
                  </div>
                </CardContent>
                <CardActions>
                  <Button
                    variant="text"
                    leadingIcon="open_in_new"
                    onClick={() => onOpenMatch(match.id)}
                  >
                    Abrir
                  </Button>
                  <Button
                    variant="text"
                    leadingIcon="download"
                    onClick={() =>
                      triggerDownload(
                        `voley-match-${match.id}.json`,
                        exportMatchAsJson(match),
                        'application/json',
                      )
                    }
                  >
                    JSON
                  </Button>
                </CardActions>
              </Card>
            )
          })
        )}
      </div>

      <Snackbar open={Boolean(statusMessage)} onClose={onDismissStatus} message={statusMessage} />
    </div>
  )
}
