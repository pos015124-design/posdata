import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
<<<<<<< HEAD
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "localhost",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "nonnomadic-tova-overstraight.ngrok-free.dev"
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
=======
      "@": path.resolve(__dirname, "./src"),
    }
  },
  server: {
    port: 3000,
    proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false
  }
}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Don't externalize react-router-dom for Heroku deployment
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-slot'
          ]
        }
      }
    }
>>>>>>> 77ffa9ad4df0a8406dc926a295435109c208a8f0
  }
})
