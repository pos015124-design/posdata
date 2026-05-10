/**
 * InstallPWA
 *
 * Shows a prominent install prompt so users know they can add E-Shop
 * to their home screen. Works on:
 *   - Android Chrome/Edge: uses the beforeinstallprompt API
 *   - iOS Safari: shows step-by-step instructions (no API available)
 *
 * Behaviour:
 *   - Waits 5 s after mount before showing (avoids interrupting page load)
 *   - "Not now" → hides for this session only
 *   - "Don't ask again" → sets localStorage flag, never shows again
 *   - Already installed (standalone mode) → never shows
 *
 * Also exports `useInstallPrompt` so the sidebar can show a persistent
 * "Install app" button for users who dismissed the sheet.
 */
import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, Plus, Smartphone, ArrowDown } from 'lucide-react';

// ── shared state so sidebar can read the prompt ──────────────────────────────
let _deferredPrompt: any = null;
let _promptListeners: Array<() => void> = [];

function notifyListeners() {
  _promptListeners.forEach(fn => fn());
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!_deferredPrompt);

  useEffect(() => {
    const update = () => setAvailable(!!_deferredPrompt);
    _promptListeners.push(update);
    return () => { _promptListeners = _promptListeners.filter(fn => fn !== update); };
  }, []);

  const trigger = useCallback(async () => {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      _deferredPrompt = null;
      notifyListeners();
    }
  }, []);

  return { available, trigger };
}

// ── main component ────────────────────────────────────────────────────────────
export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow]       = useState<'android' | 'ios' | null>(null);
  const [visible, setVisible] = useState(false); // controls slide-in animation

  useEffect(() => {
    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User said "don't ask again"
    if (localStorage.getItem('pwa-never')) return;

    const isIOS     = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari  = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      // iOS: show instructions after 5 s if not dismissed this session
      if (sessionStorage.getItem('pwa-dismissed')) return;
      const t = setTimeout(() => { setShow('ios'); setTimeout(() => setVisible(true), 50); }, 5000);
      return () => clearTimeout(t);
    }

    // Android/Chrome/Edge: capture the prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e;
      notifyListeners();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('pwa-dismissed')) {
        // Show after 5 s
        setTimeout(() => { setShow('android'); setTimeout(() => setVisible(true), 50); }, 5000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide banner once installed
    window.addEventListener('appinstalled', () => {
      _deferredPrompt = null;
      notifyListeners();
      setShow(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = (permanent = false) => {
    setVisible(false);
    setTimeout(() => setShow(null), 300);
    if (permanent) {
      localStorage.setItem('pwa-never', '1');
    } else {
      sessionStorage.setItem('pwa-dismissed', '1');
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      _deferredPrompt = null;
      notifyListeners();
      setDeferredPrompt(null);
      setShow(null);
    }
  };

  if (!show) return null;

  // ── Android / Chrome install sheet ────────────────────────────────────────
  if (show === 'android') {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => dismiss(false)}
        />

        {/* Sheet */}
        <div className={`relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-4 sm:opacity-0'
        }`}>
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-6 pt-4 pb-6">
            {/* App identity */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 border border-gray-100 p-1">
                <img src="/eshoplogo.jpeg" alt="E-Shop" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Install E-Shop</h2>
                <p className="text-sm text-gray-500">BHABY GROUP LTD</p>
              </div>
              <button
                onClick={() => dismiss(false)}
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Benefits */}
            <div className="space-y-2.5 mb-6">
              {[
                { icon: Smartphone, text: 'Works offline — manage your store anywhere' },
                { icon: ArrowDown,  text: 'Faster than the browser — opens instantly' },
                { icon: Download,   text: 'No app store needed — installs in seconds' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={install}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              <Download className="w-5 h-5" />
              Install App
            </button>

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => dismiss(false)}
                className="flex-1 h-10 text-sm text-gray-500 hover:text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={() => dismiss(true)}
                className="flex-1 h-10 text-sm text-gray-400 hover:text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Don't ask again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari instructions sheet ─────────────────────────────────────────
  if (show === 'ios') {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => dismiss(false)}
        />

        {/* Sheet */}
        <div className={`relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-6 pt-4 pb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 border border-gray-100 p-1">
                <img src="/eshoplogo.jpeg" alt="E-Shop" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Add E-Shop to Home Screen</h2>
                <p className="text-xs text-gray-500">Get the full app experience on iOS</p>
              </div>
              <button
                onClick={() => dismiss(false)}
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-3.5">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    Tap <Share className="w-4 h-4 text-blue-600 inline" /> Share
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">The share icon is in Safari's bottom toolbar</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-3.5">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    Tap <Plus className="w-4 h-4 text-blue-600 inline" /> Add to Home Screen
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Scroll down in the share sheet to find it</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-green-50 rounded-2xl p-3.5">
                <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tap Add</p>
                  <p className="text-xs text-gray-500 mt-0.5">E-Shop will appear on your home screen</p>
                </div>
              </div>
            </div>

            {/* Arrow pointing down toward Safari toolbar */}
            <div className="flex flex-col items-center gap-1 mb-5 sm:hidden">
              <p className="text-xs text-gray-400 font-medium">Share button is down here</p>
              <div className="flex flex-col items-center gap-0.5 text-blue-500">
                <div className="w-0.5 h-4 bg-blue-400 rounded-full" />
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-400" />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => dismiss(false)}
                className="flex-1 h-11 text-sm text-gray-500 font-medium rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={() => dismiss(true)}
                className="flex-1 h-11 text-sm text-gray-400 font-medium rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Don't ask again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
