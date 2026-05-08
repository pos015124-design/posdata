import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Use our hand-crafted sw.js as the base, but let vite-plugin-pwa
      // inject the Workbox precache manifest so hashed assets are cached.
      strategies: "generateSW",
      injectRegister: "script",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Don't use navigateFallback — it requires '/' to be precached
        // and causes 'non-precached-url' errors. Use NetworkFirst instead.
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // API calls: network-first, fall back to cache for 5 minutes
            urlPattern: /^https:\/\/posdata-73sd\.onrender\.com\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Uploaded images: cache-first (they don't change)
            urlPattern: /\/uploads\//,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // Cloudinary images: cache-first
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      manifest: {
        name: "E-Shop — BHABY GROUP LTD",
        short_name: "E-Shop",
        description: "Multi-vendor marketplace and seller dashboard by BHABY GROUP LTD",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        orientation: "portrait-primary",
        categories: ["shopping", "business", "productivity"],
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon"
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Marketplace",
            short_name: "Shop",
            description: "Browse all products",
            url: "/store",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Seller dashboard",
            url: "/dashboard",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          }
        ],
        screenshots: []
      },
      devOptions: {
        // Enable SW in dev so you can test it locally
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    }
  },
  base: '/',
  server: {
    port: 5173,
    host: "localhost",
    allowedHosts: ["localhost", "127.0.0.1"],
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
    sourcemap: false
  }
})
