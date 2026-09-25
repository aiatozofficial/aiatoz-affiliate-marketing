import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  appType: 'spa',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['aipatashala.com', 'www.aipatashala.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '/readiness': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '^/r/.*': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['aipatashala.com', 'www.aipatashala.com'],
    // `vite preview` is what actually runs in production on Render (this
    // service only serves the built frontend - there is no Node backend
    // here). Without this, /api, /health, /readiness, /r/* have nothing
    // handling them at all. BACKEND_URL must point at the deployed FastAPI
    // service (e.g. https://aiatoz-backend-xxxx.onrender.com).
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8003',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.BACKEND_URL || 'http://localhost:8003',
        changeOrigin: true,
      },
      '/readiness': {
        target: process.env.BACKEND_URL || 'http://localhost:8003',
        changeOrigin: true,
      },
      '^/r/.*': {
        target: process.env.BACKEND_URL || 'http://localhost:8003',
        changeOrigin: true,
      },
    },
  }
})
