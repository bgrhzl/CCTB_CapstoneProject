import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/cloudinary-upload': {
        target: 'http://localhost:5000', // backend portunuzu kontrol edin
        changeOrigin: true,
      },
      '/api/upload': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
