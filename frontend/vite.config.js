import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The PHP API is proxied in development so the browser only ever talks to
// one origin (no CORS setup needed in the React app).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
