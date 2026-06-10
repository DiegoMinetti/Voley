import { useState } from 'react'
import { Button } from './m3/Button'
import { ColorPicker } from './m3/ColorPicker'
import { Dialog } from './m3/Dialog'
import { Divider } from './m3/Divider'
import { Icon } from './m3/Icon'
import { TextField } from './m3/TextField'
import { teamColorPalette } from '../features/teams/palette'
import type { TeamConfig, TeamSide } from '../types/models'
import { isValidHexColor } from '../utils/format'
import './TeamEditDialog.css'

interface TeamEditDialogProps {
  open: boolean
  teams: Record<TeamSide, TeamConfig>
  onSave: (next: Record<TeamSide, TeamConfig>) => void
  onClose: () => void
}

/**
 * Modal for editing a match's team names and colors in-place. Used from the
 * MatchScreen so the user can adjust identities (e.g. swap jersey colors,
 * rename a team) without leaving the live scoreboard.
 *
 * The dialog keeps a local working copy and only commits to the match when
 * the user taps "Guardar", so accidental opens do not pollute the match.
 *
 * The working copy is stored in an inner component that is keyed by the
 * source-of-truth teams. This is the React-recommended "reset state with a
 * key" pattern, so we never need a `useEffect` to reset state when the
 * dialog is reopened with new data.
 */
export const TeamEditDialog = ({
  open,
  teams,
  onSave,
  onClose,
}: TeamEditDialogProps) => {
  // A signature that changes whenever the source-of-truth teams change.
  // Combining names and colors keeps the key stable as long as the user
  // hasn't committed a new edit through the parent.
  const teamsKey = `${teams.A.name}|${teams.A.color}|${teams.B.name}|${teams.B.color}`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar equipos"
      icon="group"
      content={
        <TeamEditBody
          // Remount the body whenever the committed teams change so its
          // internal working copy resets to the latest values. This avoids
          // the `setState` inside `useEffect` anti-pattern.
          key={teamsKey}
          teams={teams}
          onSave={onSave}
          onClose={onClose}
        />
      }
    />
  )
}

interface TeamEditBodyProps {
  teams: Record<TeamSide, TeamConfig>
  onSave: (next: Record<TeamSide, TeamConfig>) => void
  onClose: () => void
}

const TeamEditBody = ({ teams, onSave, onClose }: TeamEditBodyProps) => {
  const [working, setWorking] = useState<Record<TeamSide, TeamConfig>>(teams)
  const [hexInputs, setHexInputs] = useState<Record<TeamSide, string>>({
    A: teams.A.color,
    B: teams.B.color,
  })
  const [nameErrors, setNameErrors] = useState<Record<TeamSide, string>>({
    A: '',
    B: '',
  })

  const setName = (side: TeamSide, name: string): void => {
    setWorking((prev) => ({ ...prev, [side]: { ...prev[side], name } }))
    setNameErrors((prev) => ({
      ...prev,
      [side]: name.trim().length === 0 ? 'Ingresa un nombre' : '',
    }))
  }

  const setColor = (side: TeamSide, color: string): void => {
    setHexInputs((prev) => ({ ...prev, [side]: color }))
    if (isValidHexColor(color)) {
      setWorking((prev) => ({ ...prev, [side]: { ...prev[side], color } }))
    }
  }

  const commitHex = (side: TeamSide): void => {
    const value = hexInputs[side].trim()
    if (isValidHexColor(value)) {
      setWorking((prev) => ({ ...prev, [side]: { ...prev[side], color: value } }))
    } else {
      setHexInputs((prev) => ({ ...prev, [side]: working[side].color }))
    }
  }

  const handleSave = (): void => {
    const trimmed: Record<TeamSide, TeamConfig> = {
      A: {
        name: working.A.name.trim() || teams.A.name,
        color: working.A.color,
      },
      B: {
        name: working.B.name.trim() || teams.B.name,
        color: working.B.color,
      },
    }
    onSave(trimmed)
  }

  const nameAEmpty = working.A.name.trim().length === 0
  const nameBEmpty = working.B.name.trim().length === 0
  const isInvalid = nameAEmpty || nameBEmpty

  return (
    <>
      <div className="team-edit-dialog">
        <p className="team-edit-dialog__hint">
          Cambiá el nombre o el color de cada equipo. Los cambios se aplican
          al instante en el marcador del partido.
        </p>
        <TeamEditor
          side="A"
          team={working.A}
          error={nameErrors.A}
          onName={(name) => setName('A', name)}
          onColor={(color) => setColor('A', color)}
          onCommitHex={() => commitHex('A')}
        />
        <Divider />
        <TeamEditor
          side="B"
          team={working.B}
          error={nameErrors.B}
          onName={(name) => setName('B', name)}
          onColor={(color) => setColor('B', color)}
          onCommitHex={() => commitHex('B')}
        />
      </div>
      <div className="team-edit-dialog__actions">
        <Button variant="text" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="filled"
          onClick={handleSave}
          disabled={isInvalid}
          leadingIcon="check"
        >
          Guardar
        </Button>
      </div>
    </>
  )
}

interface TeamEditorProps {
  side: TeamSide
  team: TeamConfig
  error: string
  onName: (name: string) => void
  onColor: (color: string) => void
  onCommitHex: () => void
}

const TeamEditor = ({
  side,
  team,
  error,
  onName,
  onColor,
  onCommitHex,
}: TeamEditorProps) => {
  const [hexDraft, setHexDraft] = useState(team.color)

  return (
    <section
      className="team-edit-dialog__team"
      aria-labelledby={`team-edit-${side}-title`}
    >
      <h3 id={`team-edit-${side}-title`} className="team-edit-dialog__team-title">
        <Icon name={side === 'A' ? 'shield' : 'workspace_premium'} />
        Equipo {side}
        <span
          className="team-edit-dialog__chip"
          style={{
            backgroundColor: team.color,
            color: pickOnColor(team.color),
          }}
          aria-hidden
        >
          {team.name || `Equipo ${side}`}
        </span>
      </h3>
      <TextField
        label={`Nombre equipo ${side}`}
        value={team.name}
        onChange={(event) => onName(event.target.value)}
        leadingIcon="edit"
        error={Boolean(error)}
        {...(error ? { supportingText: error } : {})}
        maxLength={32}
      />
      <ColorPicker
        label={`Color del equipo ${side}`}
        value={team.color}
        palette={teamColorPalette}
        onChange={onColor}
        onCustomHexChange={(value) => {
          const normalized = value.startsWith('#') ? value : `#${value}`
          setHexDraft(normalized)
          onColor(normalized)
        }}
        id={`match-color-${side}`}
      />
      <input
        type="hidden"
        value={hexDraft}
        onBlur={() => {
          onCommitHex()
        }}
        readOnly
        aria-hidden
      />
    </section>
  )
}

/**
 * Pick a readable foreground color (black or white) for a swatch based on
 * the brightness of the background. Mirrors the heuristic in
 * `useTeamTheme` so the chip in the dialog matches the scoreboard look.
 */
const pickOnColor = (hex: string): string => {
  const normalized = hex.replace('#', '')
  if (!/^([0-9a-fA-F]{3}){1,2}$/.test(normalized)) return '#fff'
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  // Relative luminance (sRGB) per WCAG.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1b1b1b' : '#ffffff'
}
