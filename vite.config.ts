import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '筋トレ日記',
        short_name: '筋トレ日記',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f6f5',
        theme_color: '#16776f',
        lang: 'ja',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
});
