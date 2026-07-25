
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Keep VPS API awake ─────────────────────────────────────────────────────
// Fire-and-forget ping on app load — never blocks the UI.
const API = import.meta.env.VITE_API_URL || '';
if (API) {
  fetch(`${API}/ping`, { method: 'GET', cache: 'no-store' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

