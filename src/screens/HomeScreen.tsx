import { Button } from '../components/m3/Button'
import { Icon } from '../components/m3/Icon'
import { Snackbar } from '../components/m3/Snackbar'
import { TopAppBar } from '../components/m3/TopAppBar'
import type { MatchRecord } from '../types/models'
import './HomeScreen.css'

interface HomeScreenProps {
  hasInProgress: boolean
  inProgressMatch?: MatchRecord
  statusMessage: string
  onStartNew: () => void
  onContinueLast: () => void
  onOpenHistory: () => void
  onOpenSettings: () => void
  onDismissStatus: () => void
}

export const HomeScreen = ({
  hasInProgress,
  statusMessage,
  onStartNew,
  onContinueLast,
  onOpenHistory,
  onOpenSettings,
  onDismissStatus,
}: HomeScreenProps) => {
  return (
    <div className="home-screen">
      <TopAppBar
        variant="small"
        headline="Voley Match"
        actions={
          <>
            <Button
              variant="text"
              icon="history"
              iconOnly
              aria-label="Historial"
              onClick={onOpenHistory}
            />
            <Button
              variant="text"
              icon="settings"
              iconOnly
              aria-label="Configuracion"
              onClick={onOpenSettings}
            />
          </>
        }
      />
      <section className="home-screen__hero" aria-labelledby="home-title">
        <span className="home-screen__hero-icon" aria-hidden>
          <Icon name="sports_volleyball" />
        </span>
        <h1 id="home-title" className="home-screen__title">
          Marcador offline para voley
        </h1>
        <p className="home-screen__subtitle">
          Rapido, simple y listo para partidos reales. Funciona sin conexion.
        </p>
      </section>

      <div className="home-screen__actions">
        <Button
          variant="filled"
          size="large"
          fullWidth
          leadingIcon="add_circle"
          onClick={onStartNew}
        >
          Nuevo partido
        </Button>
        {hasInProgress && (
          <Button
            variant="tonal"
            size="large"
            fullWidth
            leadingIcon="play_arrow"
            onClick={onContinueLast}
          >
            Continuar ultimo
          </Button>
        )}
      </div>

      <footer className="home-screen__footer" aria-label="Informacion">
        Funciona 100% offline. Tus datos quedan en este dispositivo.
      </footer>

      <Snackbar open={Boolean(statusMessage)} onClose={onDismissStatus} message={statusMessage} />
    </div>
  )
}
