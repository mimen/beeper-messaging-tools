import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v0': {
        target: 'http://localhost:23373',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:23373',
        changeOrigin: true,
      },
      '/airtable': {
        target: 'https://api.airtable.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/airtable/, ''),
      },
    },
  },
})
