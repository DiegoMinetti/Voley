import type { UserSettings } from '../types/models'

interface SettingsPanelProps {
  settings: UserSettings
  onChange: (next: UserSettings) => void
}

export const SettingsPanel = ({ settings, onChange }: SettingsPanelProps) => {
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <section className="settings-panel" aria-label="Configuracion">
      <h2>Configuracion</h2>
      <label>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={(event) => set('darkMode', event.target.checked)}
        />
        Modo oscuro
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.vibration}
          onChange={(event) => set('vibration', event.target.checked)}
        />
        Vibracion
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.tapToAdd}
          onChange={(event) => set('tapToAdd', event.target.checked)}
        />
        Tap para sumar punto
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.confirmFinish}
          onChange={(event) => set('confirmFinish', event.target.checked)}
        />
        Confirmar finalizacion de partido
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showClock}
          onChange={(event) => set('showClock', event.target.checked)}
        />
        Mostrar cronometro
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showLiveHistory}
          onChange={(event) => set('showLiveHistory', event.target.checked)}
        />
        Mostrar historial en vivo
      </label>
    </section>
  )
}
