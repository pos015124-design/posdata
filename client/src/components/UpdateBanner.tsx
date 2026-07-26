/**
 * UpdateBanner
 *
 * Displays a non-intrusive banner at the bottom of the screen when a new
 * service worker version is waiting to activate (i.e. when the app has been
 * updated and the user needs to reload to get the new version).
 *
 * How it works:
 *   - On mount it checks whether a service worker is already registered.
 *   - It also listens for new service workers entering the "waiting" state via
 *     the "updatefound" event on the service worker registration.
 *   - When a waiting worker is detected it shows the banner.
 *   - "Update now" posts SKIP_WAITING to the waiting worker and reloads.
 *   - "Dismiss" hides the banner for the session without forcing an update.
 *
 * This works with vite-plugin-pwa's generateSW strategy and registerType:
 * "prompt" — the SW is registered automatically by the injected script and
 * this component hooks into the native SW lifecycle events.
 */
import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [visible,       setVisible]       = useState(false);

  useEffect(() => {
    // Service workers are not available in non-secure contexts or when the
    // browser does not support them.
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const handleWorkerStateChange = (worker: ServiceWorker) => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        // A new SW has installed and is waiting to take control. Show the banner.
        setWaitingWorker(worker);
        setVisible(true);
      }
    };

    const attachToRegistration = (reg: ServiceWorkerRegistration) => {
      registration = reg;

      // A worker may already be waiting (e.g. the page was already open when
      // a new SW finished installing in a background tab).
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setVisible(true);
        return;
      }

      // Listen for future updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          handleWorkerStateChange(newWorker);
        });
      });
    };

    // Check existing registration first, then poll for new ones
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) attachToRegistration(reg);
    });

    // Also listen for any new registrations (covers edge cases on slow networks)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Controller changed — page is now using the new SW. Nothing to do here;
      // the reload triggered by the update button will have caused this.
    });

    // Periodically check for updates every 60 seconds while the page is open
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          if (!registration) attachToRegistration(reg);
          reg.update().catch(() => { /* network may be offline — ignore */ });
        }
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    // Tell the waiting worker to skip waiting and activate immediately
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // Reload once the new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible || !waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Update available</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">A new version of E-Shop is ready.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          aria-label="Update app"
        >
          Update
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Dismiss update banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
