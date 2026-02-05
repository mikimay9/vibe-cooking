import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  base: './', // ← ここを '/clawd/' から './' に変更！これでどこでも動きます
  server: {
    host: true,
    port: 5173,
  },
  envPrefix: ['VITE_', 'GOOGLE_'],
}))