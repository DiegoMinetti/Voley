import { Button } from './m3/Button'
import { Divider } from './m3/Divider'
import { Dialog } from './m3/Dialog'
import { Slider } from './m3/Slider'
import './SizeSettingsDialog.css'

// Range of allowed scale multipliers (inclusive). 0.5x = half size, 2x = double.
// Kept in sync with the constants used by SettingsScreen so the two UIs feel
// identical and the persisted settings remain interoperable.
export const SCALE_MIN = 0.5
export const SCALE_MAX = 2
export const SCALE_STEP = 0.05

const safeScale = (value: number | undefined, fallback = 1): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, value))
}

export interface SizeScaleValues {
  pointsScale: number
  teamNameScale: number
  setsScale: number
  globalScale: number
}

interface SizeSettingsDialogProps {
  open: boolean
  /** Current scale values. Each missing value falls back to 1. */
  values: SizeScaleValues
  /** Called whenever the user moves a slider. Receives the new full set. */
  onChange: (next: SizeScaleValues) => void
  /** Called when the user taps the "Reset" action. */
  onReset: () => void
  onClose: () => void
}

/**
 * Modal that exposes the four scoreboard size scales (points, team name, sets
 * pill, and a global multiplier) and reflects the changes in real time on the
 * underlying scoreboard thanks to the parent re-rendering with the new props.
 */
export const SizeSettingsDialog = ({
  open,
  values,
  onChange,
  onReset,
  onClose,
}: SizeSettingsDialogProps) => {
  const pointsScale = safeScale(values.pointsScale)
  const teamNameScale = safeScale(values.teamNameScale)
  const setsScale = safeScale(values.setsScale)
  const globalScale = safeScale(values.globalScale)

  const set = <K extends keyof SizeScaleValues>(
    key: K,
    value: SizeScaleValues[K],
  ) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tamaños del marcador"
      icon="format_size"
      content={
        <div className="size-settings-dialog">
          <p className="size-settings-dialog__hint">
            Ajustá el tamaño del número de puntos, el nombre del equipo y la
            pastilla de sets. Los cambios se aplican al instante en el marcador.
          </p>
          <div className="size-settings-dialog__sliders">
            <Slider
              label="Número de puntos"
              supporting="Tamaño del contador principal en cada mitad del marcador."
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
              supporting="Tamaño del texto del equipo debajo de los puntos."
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
              supporting="Tamaño de la pastilla que muestra los sets ganados."
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
          <Divider />
          <div className="size-settings-dialog__footer">
            <Button
              variant="text"
              size="small"
              leadingIcon="restart_alt"
              onClick={onReset}
            >
              Restablecer tamaños
            </Button>
          </div>
        </div>
      }
      actions={
        <Button variant="filled" onClick={onClose}>
          Listo
        </Button>
      }
    />
  )
}
