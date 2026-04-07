import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Fix: Rolldown (Vite 8) can't resolve 'react-is' from recharts' es6 modules.
  // Pre-bundling it ensures it's available as a proper CJS/ESM module.
  optimizeDeps: {
    include: ['react-is'],
  },
  build: {
    // Code-split by route to avoid a single 900 kB bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || (id.includes('react') && !id.includes('recharts') && !id.includes('react-is') && !id.includes('react-leaflet'))) return 'vendor-react';
            if (id.includes('recharts') || id.includes('react-is')) return 'vendor-charts';
            if (id.includes('leaflet')) return 'vendor-map';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TravelMind - Planificador de Viajes',
        short_name: 'TravelMind',
        description: 'Planifica y organiza tus viajes de forma visual e intuitiva',
        theme_color: '#4F46E5',
        background_color: '#0F172A',
        display: 'standalone',
        lang: 'es',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ]
})
