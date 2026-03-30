import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Diário da Helena',
        short_name: 'Helena',
        description: 'Acompanhe o dia a dia da bebê Helena',
        theme_color: '#7C3AED',
        background_color: '#130f2a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Amamentar',  short_name: 'Mamar',    url: '/mamar',  icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Fralda',     short_name: 'Fralda',   url: '/fralda', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Sono',       short_name: 'Sono',     url: '/sono',   icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Histórico',  short_name: 'Histórico',url: '/historico', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
})
