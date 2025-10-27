import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 8000,
    open: false,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 100
    },
    headers: mode === 'development' ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } : {
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  optimizeDeps: {
    force: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  cacheDir: 'node_modules/.vite'
}))