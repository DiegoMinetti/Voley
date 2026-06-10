import { useCallback } from 'react'
import { Button } from '../components/m3/Button'
import { Divider } from '../components/m3/Divider'
import { Icon } from '../components/m3/Icon'
import { IconButton } from '../components/m3/IconButton'
import { List, ListItem, ListItemDivider } from '../components/m3/ListItem'
import { Slider } from '../components/m3/Slider'
import { Switch } from '../components/m3/Switch'
import { TopAppBar } from '../components/m3/TopAppBar'
import type { UserSettings } from '../types/models'
import './SettingsScreen.css'

interface SettingsScreenProps {
  settings: UserSettings
  onChange: (next: UserSettings) => void
  onBack: () => void
}

// Range of allowed scale multipliers (inclusive). 0.5x = half size, 2x = double.
const SCALE_MIN = 0.5
const SCALE_MAX = 2
const SCALE_STEP = 0.05

const safeScale = (value: number | undefined, fallback = 1): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, value))
}

export const SettingsScreen = ({ settings, onChange, onBack }: SettingsScreenProps) => {
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const pointsScale = safeScale(settings.pointsScale)
  const teamNameScale = safeScale(settings.teamNameScale)
  const setsScale = safeScale(settings.setsScale)
  const globalScale = safeScale(settings.globalScale)

  const resetScales = useCallback(() => {
    onChange({
      ...settings,
      pointsScale: 1,
      teamNameScale: 1,
      setsScale: 1,
      globalScale: 1,
    })
  }, [onChange, settings])

  return (
    <div className="settings-screen">
      <TopAppBar
        variant="small"
        headline="Configuracion"
        leading={
          <IconButton icon="arrow_back" label="Volver" variant="standard" onClick={onBack} />
        }
      />

      <div className="settings-screen__group">
        <h2 className="settings-screen__group-header">
          <Icon name="palette" />
          Apariencia
        </h2>
        <List>
          <ListItem
            type="button"
            onClick={() => set('darkMode', !settings.darkMode)}
            headline="Modo oscuro"
            supporting="Cambia entre el esquema claro y oscuro del sistema."
            trailing={
              <Switch
                checked={settings.darkMode}
                onChange={(event) => set('darkMode', event.target.checked)}
              />
            }
          />
        </List>
      </div>

      <div className="settings-screen__group">
        <h2 className="settings-screen__group-header">
          <Icon name="format_size" />
          Tamano de texto
        </h2>
        <p className="settings-screen__group-hint">
          Ajusta el tamano del numero de puntos, el nombre del equipo y la
          pastilla de sets. El control global multiplica los tres a la vez.
        </p>
        <div className="settings-screen__sliders">
          <Slider
            label="Numero de puntos"
            supporting="Tamano del contador principal en cada mitad del marcador."
            value={pointsScale}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={SCALE_STEP}
            decimals={2}
            onChange={(value) => set('pointsScale', value)}
          />
          <div className="md-divider" />
          <Slider
            label="Nombre del equipo"
            supporting="Tamano del texto del equipo debajo de los puntos."
            value={teamNameScale}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={SCALE_STEP}
            decimals={2}
            onChange={(value) => set('teamNameScale', value)}
          />
          <div className="md-divider" />
          <Slider
            label="Sets"
            supporting="Tamano de la pastilla que muestra los sets ganados."
            value={setsScale}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={SCALE_STEP}
            decimals={2}
            onChange={(value) => set('setsScale', value)}
          />
          <div className="md-divider" />
          <Slider
            label="Todo junto"
            supporting="Multiplica los tres tamaños anteriores al mismo tiempo."
            value={globalScale}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={SCALE_STEP}
            decimals={2}
            onChange={(value) => set('globalScale', value)}
          />
        </div>
        <div className="settings-screen__group-footer">
          <Button
            variant="text"
            size="small"
            leadingIcon="restart_alt"
            onClick={resetScales}
          >
            Restablecer tamaños
          </Button>
        </div>
      </div>

      <div className="settings-screen__group">
        <h2 className="settings-screen__group-header">
          <Icon name="touch_app" />
          Marcador
        </h2>
        <List>
          <ListItem
            type="button"
            onClick={() => set('tapToAdd', !settings.tapToAdd)}
            headline="Toque para sumar punto"
            supporting="Ademas del swipe, un toque corto suma un punto."
            trailing={
              <Switch
                checked={settings.tapToAdd}
                onChange={(event) => set('tapToAdd', event.target.checked)}
              />
            }
          />
          <ListItemDivider />
          <ListItem
            type="button"
            onClick={() => set('confirmFinish', !settings.confirmFinish)}
            headline="Confirmar al finalizar"
            supporting="Pedir confirmacion antes de cerrar el partido."
            trailing={
              <Switch
                checked={settings.confirmFinish}
                onChange={(event) => set('confirmFinish', event.target.checked)}
              />
            }
          />
          <ListItemDivider />
          <ListItem
            type="button"
            onClick={() => set('showTimeoutButtons', !settings.showTimeoutButtons)}
            headline="Botones de timeout"
            supporting="Mostrar los botones para registrar timeouts durante el partido."
            trailing={
              <Switch
                checked={settings.showTimeoutButtons}
                onChange={(event) => set('showTimeoutButtons', event.target.checked)}
              />
            }
          />
        </List>
      </div>

      <div className="settings-screen__group">
        <h2 className="settings-screen__group-header">
          <Icon name="notifications" />
          Retroalimentacion
        </h2>
        <List>
          <ListItem
            type="button"
            onClick={() => set('vibration', !settings.vibration)}
            headline="Vibracion"
            supporting="Pulso haptic corto al registrar un punto."
            trailing={
              <Switch
                checked={settings.vibration}
                onChange={(event) => set('vibration', event.target.checked)}
              />
            }
          />
        </List>
      </div>

      <div className="settings-screen__group">
        <h2 className="settings-screen__group-header">
          <Icon name="visibility" />
          Pantalla
        </h2>
        <List>
          <ListItem
            type="button"
            onClick={() => set('showClock', !settings.showClock)}
            headline="Mostrar cronometro"
            supporting="Reloj visible durante el partido."
            trailing={
              <Switch
                checked={settings.showClock}
                onChange={(event) => set('showClock', event.target.checked)}
              />
            }
          />
        </List>
      </div>

      <div className="settings-screen__about" role="note">
        <Icon name="info" />
        <div>
          <strong>Voley Match PWA</strong>
          <p style={{ margin: 0, fontSize: 'var(--md-sys-typescale-body-small-size)' }}>
            Marcador offline construido con Material Design 3. Todos los datos
            quedan en tu dispositivo.
          </p>
        </div>
      </div>

      <Divider />

      <div className="settings-screen__footer">
        <Button variant="filled" fullWidth leadingIcon="check" onClick={onBack}>
          Listo
        </Button>
      </div>
    </div>
  )
}
