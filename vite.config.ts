import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __COMMIT_SHA__: JSON.stringify(process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local')
  },
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: '筋トレ日記',
      short_name: '筋トレ日記',
      description: '筋トレと体重をすばやく記録できるオフライン対応アプリ',
      start_url: '/',
      display: 'standalone',
      background_color: '#f4f6f5',
      theme_color: '#16776f',
      lang: 'ja',
      categories: ['health', 'fitness', 'lifestyle'],
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/maskable-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    }
  }), cloudflare()]
});
