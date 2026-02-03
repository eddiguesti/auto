import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  // Security: Only expose VITE_ prefixed env vars to client
  envPrefix: 'VITE_',
  build: {
    // Generate source maps only in development
    sourcemap: process.env.NODE_ENV !== 'production',
    // Performance: Target modern browsers for smaller bundles
    target: 'es2020',
    // Performance: Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        compact: true,
        // Performance: Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - rarely change, cache well
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@react-oauth/google', '@tabler/icons-react']
        }
      }
    }
  },
  // Security: Explicitly prevent ALL server secrets from bundling
  // This provides defense-in-depth alongside envPrefix: 'VITE_'
  define: {
    // Authentication secrets
    'process.env.JWT_SECRET': 'undefined',
    'process.env.GOOGLE_CLIENT_SECRET': 'undefined',
    // Database
    'process.env.DATABASE_URL': 'undefined',
    // Payment secrets
    'process.env.STRIPE_SECRET_KEY': 'undefined',
    'process.env.STRIPE_WEBHOOK_SECRET': 'undefined',
    // AI/API keys
    'process.env.GROK_API_KEY': 'undefined',
    'process.env.REPLICATE_API_TOKEN': 'undefined',
    'process.env.FISH_AUDIO_API_KEY': 'undefined',
    // Print-on-demand secrets
    'process.env.LULU_CLIENT_KEY': 'undefined',
    'process.env.LULU_CLIENT_SECRET': 'undefined',
    // Messaging secrets
    'process.env.TELEGRAM_BOT_TOKEN': 'undefined',
    'process.env.TELEGRAM_WEBHOOK_SECRET': 'undefined'
  }
})
