import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Apply saved theme synchronously to avoid a flash of incorrect theme.
const stored = window.localStorage.getItem('voley-dark-mode')
if (stored !== null) {
  document.documentElement.dataset.theme =
    stored === '1' ? 'dark' : 'light'
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.dataset.theme = 'dark'
}

registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
