import { useState, useEffect, useCallback, useRef } from 'react';
import * as notificationsApi from '../api/notifications';
import type { AppNotification } from '../api/notifications';

/**
 * In-app notification feed for the bell.
 * - Polls unread count cheaply on an interval
 * - Full refresh on window focus, cross-tab storage events, and realtime socket events
 * - Optimistically marks notifications read
 */
export function useNotificationFeed(pollMs = 45_000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchingRef = useRef(false);
  const lastCountRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await notificationsApi.getNotifications(20);
      const list: AppNotification[] = Array.isArray(data.notifications) ? data.notifications : [];
      const count = data.unreadCount ?? 0;
      setNotifications(list);
      setUnreadCount(count);

      // Notify other open tabs when the count increases
      if (lastCountRef.current !== null && count > lastCountRef.current) {
        localStorage.setItem('notifications-updated', Date.now().toString());
      }
      lastCountRef.current = count;
    } catch {
      // Unauthenticated or network error — keep current state (polling retries)
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refreshUnreadOnly = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
      lastCountRef.current = count;
    } catch {
      // ignore — next poll retries
    }
  }, []);

  // Initial load + interval + focus + cross-tab + realtime events
  useEffect(() => {
    refresh();
    const interval = setInterval(refreshUnreadOnly, pollMs);

    const onFocus = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'notifications-updated') refresh();
    };
    const onRealtime = () => refresh();
    const onSale = () => refreshUnreadOnly();
    const onPayment = () => refresh();

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('notification-realtime', onRealtime);
    window.addEventListener('sale-created', onSale);
    window.addEventListener('payment-confirmed', onPayment);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('notification-realtime', onRealtime);
      window.removeEventListener('sale-created', onSale);
      window.removeEventListener('payment-confirmed', onPayment);
    };
  }, [refresh, refreshUnreadOnly, pollMs]);

  const markRead = useCallback(async (id: string) => {
    const wasUnread = notifications.some(n => n._id === id && !n.read);
    setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
    try {
      await notificationsApi.markNotificationRead(id);
    } catch {
      // optimistic update stands; server syncs on next refresh
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllNotificationsRead();
    } catch {
      // optimistic update stands
    }
  }, []);

  return { notifications, unreadCount, refresh, markRead, markAllRead };
}
