import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/clawd/' : '/',
  server: {
    host: true,
    port: 5173,
  },
  envPrefix: ['VITE_', 'GOOGLE_'],
}))
