import { useCallback, useState } from 'react'
import { Button } from '../components/m3/Button'
import { ColorPicker } from '../components/m3/ColorPicker'
import { Divider } from '../components/m3/Divider'
import { Icon } from '../components/m3/Icon'
import { IconButton } from '../components/m3/IconButton'
import { List, ListItem, ListItemDivider } from '../components/m3/ListItem'
import { Slider } from '../components/m3/Slider'
import { Switch } from '../components/m3/Switch'
import { TextField } from '../components/m3/TextField'
import { TopAppBar } from '../components/m3/TopAppBar'
import { teamColorPalette } from '../features/teams/palette'
import { defaultTeamA, defaultTeamB } from '../storage/defaults'
import type { TeamConfig, TeamSide, UserSettings } from '../types/models'
import { isValidHexColor } from '../utils/format'
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

const safeTeam = (value: TeamConfig | undefined, fallback: TeamConfig): TeamConfig => ({
  name: value?.name ?? fallback.name,
  color: value?.color ?? fallback.color,
})

export const SettingsScreen = ({ settings, onChange, onBack }: SettingsScreenProps) => {
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const pointsScale = safeScale(settings.pointsScale)
  const teamNameScale = safeScale(settings.teamNameScale)
  const setsScale = safeScale(settings.setsScale)
  const globalScale = safeScale(settings.globalScale)

  const teamA = safeTeam(settings.defaultTeamA, defaultTeamA)
  const teamB = safeTeam(settings.defaultTeamB, defaultTeamB)

  // Local mirror of the hex text field. Lets the user type partial values
  // (e.g. "#0") without losing what they already have on the team object.
  const [hexInputs, setHexInputs] = useState<Record<TeamSide, string>>({
    A: teamA.color,
    B: teamB.color,
  })

  const setDefaultTeamName = (side: TeamSide, name: string): void => {
    const key = side === 'A' ? 'defaultTeamA' : 'defaultTeamB'
    const current = side === 'A' ? teamA : teamB
    set(key, { ...current, name })
  }

  const setDefaultTeamColor = (side: TeamSide, color: string): void => {
    setHexInputs((prev) => ({ ...prev, [side]: color }))
    if (isValidHexColor(color)) {
      const key = side === 'A' ? 'defaultTeamA' : 'defaultTeamB'
      const current = side === 'A' ? teamA : teamB
      set(key, { ...current, color })
    }
  }

  const commitHex = (side: TeamSide): void => {
    const value = hexInputs[side].trim()
    const key = side === 'A' ? 'defaultTeamA' : 'defaultTeamB'
    const current = side === 'A' ? teamA : teamB
    if (isValidHexColor(value)) {
      set(key, { ...current, color: value })
    } else {
      setHexInputs((prev) => ({ ...prev, [side]: current.color }))
    }
  }

  const resetScales = useCallback(() => {
    onChange({
      ...settings,
      pointsScale: 1,
      teamNameScale: 1,
      setsScale: 1,
      globalScale: 1,
    })
  }, [onChange, settings])

  const resetTeams = useCallback(() => {
    onChange({
      ...settings,
      defaultTeamA: { ...defaultTeamA },
      defaultTeamB: { ...defaultTeamB },
    })
    setHexInputs({ A: defaultTeamA.color, B: defaultTeamB.color })
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
          <Icon name="groups" />
          Equipos por defecto
        </h2>
        <p className="settings-screen__group-hint">
          Nombre y color que se usaran como base al crear un nuevo partido.
          Siempre podes modificarlos partido a partido.
        </p>

        <div className="settings-screen__team">
          <div className="settings-screen__team-header">
            <span
              className="settings-screen__team-swatch"
              style={{ background: teamA.color }}
              aria-hidden
            />
            <span className="settings-screen__team-title">Equipo A</span>
          </div>
          <TextField
            label="Nombre del equipo A"
            value={teamA.name}
            leadingIcon="edit"
            onChange={(event) => setDefaultTeamName('A', event.target.value)}
          />
          <ColorPicker
            label="Color del equipo A"
            value={teamA.color}
            palette={teamColorPalette}
            onChange={(color) => setDefaultTeamColor('A', color)}
            onCustomHexChange={(value) =>
              setDefaultTeamColor('A', value.startsWith('#') ? value : `#${value}`)
            }
            id="settings-color-A"
          />
          <input
            type="hidden"
            value={hexInputs.A}
            onBlur={() => commitHex('A')}
            readOnly
            aria-hidden
          />
        </div>

        <div className="md-divider" />

        <div className="settings-screen__team">
          <div className="settings-screen__team-header">
            <span
              className="settings-screen__team-swatch"
              style={{ background: teamB.color }}
              aria-hidden
            />
            <span className="settings-screen__team-title">Equipo B</span>
          </div>
          <TextField
            label="Nombre del equipo B"
            value={teamB.name}
            leadingIcon="edit"
            onChange={(event) => setDefaultTeamName('B', event.target.value)}
          />
          <ColorPicker
            label="Color del equipo B"
            value={teamB.color}
            palette={teamColorPalette}
            onChange={(color) => setDefaultTeamColor('B', color)}
            onCustomHexChange={(value) =>
              setDefaultTeamColor('B', value.startsWith('#') ? value : `#${value}`)
            }
            id="settings-color-B"
          />
          <input
            type="hidden"
            value={hexInputs.B}
            onBlur={() => commitHex('B')}
            readOnly
            aria-hidden
          />
        </div>

        <div className="settings-screen__group-footer">
          <Button
            variant="text"
            size="small"
            leadingIcon="restart_alt"
            onClick={resetTeams}
          >
            Restablecer equipos
          </Button>
        </div>
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
          <Icon name="timer" />
          Temporizador
        </h2>
        <p className="settings-screen__group-hint">
          El cronometro y sus botones vienen desactivados por defecto.
          Activalos si queres llevar el tiempo del partido y poder
          iniciarlo, pausarlo o reiniciarlo desde la barra superior.
        </p>
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
          <ListItemDivider />
          <ListItem
            type="button"
            onClick={() => set('showTimerControls', !(settings.showTimerControls ?? false))}
            headline="Botones del temporizador"
            supporting="Mostrar los botones para iniciar, pausar y reiniciar el cronometro."
            trailing={
              <Switch
                checked={settings.showTimerControls ?? false}
                onChange={(event) => set('showTimerControls', event.target.checked)}
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
