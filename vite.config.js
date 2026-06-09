import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api/link': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/webhooks': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/documents': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/hands': {
        target: 'http://localhost:8002',
        changeOrigin: true
      },
      '/api/mail': {
        target: 'http://localhost:8003',
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Velocity Note AI',
        short_name: 'Blitz',
        description: 'Zero-UI-friction context capture and triage',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  }
})
