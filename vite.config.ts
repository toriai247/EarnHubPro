import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Removed "@" alias to prevent resolution conflicts in web container environment
    },
  },
  server: {
    proxy: {
      '/api/openrouter': {
        target: 'https://openrouter.ai/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openrouter/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ["recharts", "lucide-react", "framer-motion"]
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production to save build size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'recharts', 'canvas-confetti'],
          'vendor-db': ['@supabase/supabase-js'],
        }
      }
    }
  }
})