import { Button } from '../components/m3/Button'
import { Icon } from '../components/m3/Icon'
import { NavigationBar } from '../components/m3/NavigationBar'
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
        headline="Voley Match PWA"
        actions={
          <Button
            variant="text"
            icon="settings"
            iconOnly
            aria-label="Configuracion"
            onClick={onOpenSettings}
          />
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
        {hasInProgress && (
          <div className="home-screen__hint" role="status">
            <Icon name="play_circle" />
            Tienes un partido en curso que puedes continuar.
          </div>
        )}

        <Button
          variant="filled"
          size="large"
          fullWidth
          leadingIcon="add_circle"
          onClick={onStartNew}
        >
          Nuevo partido
        </Button>
        <Button
          variant="tonal"
          size="large"
          fullWidth
          leadingIcon="play_arrow"
          onClick={onContinueLast}
          disabled={!hasInProgress}
        >
          Continuar ultimo
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          leadingIcon="history"
          onClick={onOpenHistory}
        >
          Historial
        </Button>
        <Button
          variant="text"
          size="large"
          fullWidth
          leadingIcon="settings"
          onClick={onOpenSettings}
        >
          Configuracion
        </Button>
      </div>

      <NavigationBar
        items={[
          { key: 'home', label: 'Inicio', icon: 'home', active: true },
          { key: 'new', label: 'Nuevo', icon: 'add', onClick: onStartNew },
          {
            key: 'history',
            label: 'Historial',
            icon: 'history',
            onClick: onOpenHistory,
          },
          {
            key: 'settings',
            label: 'Ajustes',
            icon: 'settings',
            onClick: onOpenSettings,
          },
        ]}
      />

      <Snackbar open={Boolean(statusMessage)} onClose={onDismissStatus} message={statusMessage} />
    </div>
  )
}
