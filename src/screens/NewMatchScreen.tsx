import { Button } from '../components/m3/Button'
import { ColorPicker } from '../components/m3/ColorPicker'
import { Icon } from '../components/m3/Icon'
import { IconButton } from '../components/m3/IconButton'
import { SegmentedButton } from '../components/m3/SegmentedButton'
import { Select } from '../components/m3/Select'
import { Switch } from '../components/m3/Switch'
import { TextField } from '../components/m3/TextField'
import { TopAppBar } from '../components/m3/TopAppBar'
import { defaultMatchConfig } from '../storage/defaults'
import type { BestOfSets, MatchConfig, TeamConfig, TeamSide } from '../types/models'
import { teamColorPalette } from '../features/teams/palette'
import './NewMatchScreen.css'

interface NewMatchScreenProps {
  teams: Record<TeamSide, TeamConfig>
  config: MatchConfig
  onTeamChange: (side: TeamSide, team: TeamConfig) => void
  onConfigChange: (config: MatchConfig) => void
  onStart: () => void
  onCancel: () => void
}

export const NewMatchScreen = ({
  teams,
  config,
  onTeamChange,
  onConfigChange,
  onStart,
  onCancel,
}: NewMatchScreenProps) => {
  const setTeamName = (side: TeamSide, name: string): void => {
    onTeamChange(side, { ...teams[side], name })
  }

  const setTeamColor = (side: TeamSide, color: string): void => {
    onTeamChange(side, { ...teams[side], color })
  }

  const setBestOf = (value: number): void => {
    onConfigChange({ ...config, bestOf: value as BestOfSets })
  }

  const setNumber = (key: keyof MatchConfig, value: number): void => {
    onConfigChange({ ...config, [key]: value })
  }

  return (
    <div className="form-screen">
      <TopAppBar
        variant="small"
        headline="Nuevo partido"
        leading={
          <IconButton
            icon="arrow_back"
            label="Volver"
            variant="standard"
            onClick={onCancel}
          />
        }
      />
      <div className="form-screen__content">
        <TeamSection
          side="A"
          team={teams.A}
          onName={(name) => setTeamName('A', name)}
          onColor={(color) => setTeamColor('A', color)}
        />
        <TeamSection
          side="B"
          team={teams.B}
          onName={(name) => setTeamName('B', name)}
          onColor={(color) => setTeamColor('B', color)}
        />

        <section className="form-screen__section" aria-labelledby="config-title">
          <h2 id="config-title" className="form-screen__section-header">
            <Icon name="tune" />
            Configuracion del partido
          </h2>

          <Select
            label="Sets"
            supportingText="Al mejor de N sets (gana el que llega a la mitad +1)"
            value={config.bestOf}
            onChange={(event) => setBestOf(Number(event.target.value) || defaultMatchConfig.bestOf)}
            options={[
              { value: 1, label: '1 set' },
              { value: 3, label: '3 sets' },
              { value: 5, label: '5 sets' },
            ]}
          />

          <SegmentedButton
            aria-label="Sets"
            value={config.bestOf}
            onChange={setBestOf}
            options={[
              { value: 1, label: '1 set', icon: 'looks_one' },
              { value: 3, label: '3 sets', icon: 'looks_3' },
              { value: 5, label: '5 sets', icon: 'looks_5' },
            ]}
          />

          <div className="form-screen__row">
            <TextField
              label="Puntos por set"
              type="number"
              min={1}
              value={config.pointsPerSet}
              onChange={(event) => setNumber('pointsPerSet', Number(event.target.value) || 1)}
              leadingIcon="scoreboard"
            />
            <TextField
              label="Diferencia minima"
              type="number"
              min={1}
              value={config.minDifference}
              onChange={(event) => setNumber('minDifference', Number(event.target.value) || 1)}
              leadingIcon="compare_arrows"
            />
          </div>
          <TextField
            label="Puntos del set decisivo (tie-break)"
            type="number"
            min={1}
            value={config.tieBreakPoints}
            supportingText="Solo se aplica al ultimo set si la serie es al mejor de 3 o 5."
            onChange={(event) => setNumber('tieBreakPoints', Number(event.target.value) || 1)}
            leadingIcon="flag"
          />

          <Switch
            label="Vibrar al sumar punto"
            description="Pulso haptic corto al registrar un punto."
            checked={config.vibration}
            onChange={(event) =>
              onConfigChange({ ...config, vibration: event.target.checked })
            }
          />
          <Switch
            label="Toque para sumar punto"
            description="Ademas del gesto, un toque corto suma un punto."
            checked={config.tapToAdd}
            onChange={(event) =>
              onConfigChange({ ...config, tapToAdd: event.target.checked })
            }
          />
          <Switch
            label="Confirmar al finalizar"
            description="Pedir confirmacion antes de cerrar el partido."
            checked={config.confirmFinish}
            onChange={(event) =>
              onConfigChange({ ...config, confirmFinish: event.target.checked })
            }
          />
          <Switch
            label="Mostrar cronometro"
            description="Reloj visible durante el partido."
            checked={config.showClock}
            onChange={(event) =>
              onConfigChange({ ...config, showClock: event.target.checked })
            }
          />
          <Switch
            label="Botones del temporizador"
            description="Mostrar los botones para iniciar, pausar y reiniciar el cronometro."
            checked={config.showTimerControls ?? false}
            onChange={(event) =>
              onConfigChange({ ...config, showTimerControls: event.target.checked })
            }
          />
          <Switch
            label="Botones de timeout"
            description="Mostrar los botones para registrar timeouts durante el partido."
            checked={config.showTimeoutButtons}
            onChange={(event) =>
              onConfigChange({ ...config, showTimeoutButtons: event.target.checked })
            }
          />
        </section>
      </div>

      <div className="form-screen__footer">
        <Button variant="text" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="filled" fullWidth leadingIcon="play_arrow" onClick={onStart}>
          Iniciar partido
        </Button>
      </div>
    </div>
  )
}

interface TeamSectionProps {
  side: TeamSide
  team: TeamConfig
  onName: (name: string) => void
  onColor: (color: string) => void
}

const TeamSection = ({ side, team, onName, onColor }: TeamSectionProps) => {
  return (
    <section
      className="form-screen__section"
      aria-labelledby={`team-${side}-title`}
    >
      <h2 id={`team-${side}-title`} className="form-screen__section-header">
        <Icon name={side === 'A' ? 'shield' : 'workspace_premium'} />
        Equipo {side}
      </h2>
      <TextField
        label={`Nombre equipo ${side}`}
        value={team.name}
        onChange={(event) => onName(event.target.value)}
        leadingIcon="edit"
      />
      <ColorPicker
        label={`Color del equipo ${side}`}
        value={team.color}
        palette={teamColorPalette}
        onChange={onColor}
      />
    </section>
  )
}
