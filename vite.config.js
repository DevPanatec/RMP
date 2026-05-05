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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'maps-maplibre';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps-leaflet';
          if (id.includes('pdfmake')) return 'pdf';
          if (id.includes('@clerk')) return 'clerk';
          if (id.includes('convex')) return 'convex';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-hot-toast') || id.includes('react-sparklines')) return 'ui-libs';
          if (id.includes('@googlemaps')) return 'google-maps';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('/react/')) return 'react';
          return 'vendor';
        }
      }
    }
  },
  cacheDir: 'node_modules/.vite'
}))