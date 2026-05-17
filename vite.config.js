import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single unified codebase: Vite serves the React UI in dev and proxies
// every /api call to the Express + SQLite backend running on port 4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
