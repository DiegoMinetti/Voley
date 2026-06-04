import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => {
  const repoName = 'Voley'
  const base = process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'favicon.svg'],
        manifest: {
          name: 'Voley Match PWA',
          short_name: 'Voley',
          description: 'Marcador de voley offline con event sourcing',
          theme_color: '#0f5ea8',
          background_color: '#f6f2e8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        },
      }),
    ],
  }
})
