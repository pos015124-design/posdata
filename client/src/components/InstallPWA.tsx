/**
 * InstallPWA — shows a "Install E-Shop" banner when the browser fires
 * the beforeinstallprompt event (Chrome/Edge/Android).
 * On iOS Safari it shows manual instructions since iOS doesn't support
 * the prompt API.
 */
import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user dismissed it this session
    if (sessionStorage.getItem('pwa-dismissed')) return;

    // Detect iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      // Show iOS instructions after 3 seconds
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Chrome/Edge/Android: listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    setShowIOS(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  if (dismissed) return null;

  // Android/Chrome install banner
  if (showBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow">
            <span className="text-white font-black text-lg">E</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Install E-Shop</p>
            <p className="text-xs text-gray-500">Add to home screen for the best experience</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />Install
            </button>
            <button onClick={dismiss} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari instructions
  if (showIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow">
                <span className="text-white font-black">E</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Install E-Shop</p>
                <p className="text-xs text-gray-500">Add to your home screen</p>
              </div>
            </div>
            <button onClick={dismiss} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <Share className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Tap the <strong>Share</strong> button in Safari's toolbar</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <Plus className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Tap <strong>"Add to Home Screen"</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
