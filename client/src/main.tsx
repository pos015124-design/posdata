
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Keep Render awake ──────────────────────────────────────────────────────
// Render free tier sleeps after 15 min of inactivity. Ping the API
// immediately on app load so the server wakes up before the user
// tries to do anything. Fire-and-forget — never blocks the UI.
const API = import.meta.env.VITE_API_URL || '';
if (API) {
  fetch(`${API}/ping`, { method: 'GET', cache: 'no-store' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

