import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const API_PORT = process.env.PORT || 3001

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: true },
      '/uploads': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900
  }
})
