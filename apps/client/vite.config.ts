import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'tesseract/lang/*.traineddata.gz',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'Giumag PDF',
        short_name: 'Giumag PDF',
        lang: 'it',
        description: 'Strumenti PDF privati elaborati direttamente sul dispositivo.',
        theme_color: '#111318',
        background_color: '#111318',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: []
      }
    })
  ],
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
