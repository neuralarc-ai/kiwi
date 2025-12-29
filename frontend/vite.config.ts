import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Ensure public folder is copied to dist (for _redirects file)
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',

      
  },
})

