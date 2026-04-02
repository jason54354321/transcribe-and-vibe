/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const backendPort = process.env.BACKEND_PORT || '8000'
const backendProxy = {
  '/api': {
    target: `http://127.0.0.1:${backendPort}`,
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: backendProxy,
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: backendProxy,
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/benchmark/**/*.test.ts'],
  },
})
