import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Real-time notification listener.
 * Connects to the same-origin socket.io endpoint with the JWT and, when a
 * targeted "notification" event arrives, dispatches a window event that the
 * notification feed listens to. Degrades silently to polling when the socket
 * can't connect (offline, CORS, no server socket) — never throws.
 */
export function useRealtimeNotifications() {
  const enabledRef = useRef(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !enabledRef.current) return;

    let socket: Socket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        // VITE_API_URL is '' on same-origin production builds — perfect for socket.io
        const url = import.meta.env.VITE_API_URL || undefined;
        socket = io(url, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
          timeout: 6000
        });

        socket.on('notification', () => {
          if (!cancelled) {
            window.dispatchEvent(new CustomEvent('notification-realtime'));
          }
        });

        // A payment confirmation landed (Selcom webhook/status confirm).
        // Refresh the bell feed AND nudge dashboard/orders pages to re-fetch.
        socket.on('payment-confirmed', (payload) => {
          if (cancelled) return;
          window.dispatchEvent(new CustomEvent('payment-confirmed', { detail: payload }));
          window.dispatchEvent(new Event('sale-created'));
        });

        socket.on('connect_error', () => {
          // Socket unavailable — the polling feed covers us. Give up quietly.
          socket?.disconnect();
        });
      } catch {
        // No socket support — poll fallback only
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.disconnect();
    };
  }, []);
}
