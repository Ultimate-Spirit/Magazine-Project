import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Polyfills Buffer, process, etc. — required by @react-pdf/renderer
    nodePolyfills({
      // Explicitly include buffer so @react-pdf/renderer can encode fonts & images
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
  ],
  server: {
    proxy: {
      '/_/backend': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_\/backend/, '')
      }
    }
  }
})
