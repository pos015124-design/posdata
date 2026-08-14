import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ShoppingBag, AlertTriangle, CheckCircle, Ban, Info, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemNotifications, SystemNotificationsList } from './SystemNotifications';
import { useNotificationFeed } from '../hooks/useNotificationFeed';
import { getPendingUserCount } from '../api/notifications';
import type { AppNotification } from '../api/notifications';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'order':
    case 'sale':
      return <ShoppingBag className="w-4 h-4 text-blue-600" />;
    case 'low_stock':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'approval':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'suspension':
      return <Ban className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

/**
 * NotificationsBell — live unread-count badge + dropdown.
 * Top section: real in-app notifications from the API (orders, approvals,
 * low stock, suspensions). Bottom section: dismissible system tips.
 */
export default function NotificationsBell({ placement = 'top-right' }: { placement?: 'top-right' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();
  const { visibleTips, visibleNotifications, dismissItem, total: tipsTotal } = useSystemNotifications();
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotificationFeed();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';

  // Refresh the feed whenever the dropdown opens so it's always current
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Super admins also see how many registrations are awaiting approval
  useEffect(() => {
    if (!open || !isSuperAdmin) return;
    let cancelled = false;
    getPendingUserCount()
      .then(count => { if (!cancelled) setPendingCount(count); })
      .catch(() => { if (!cancelled) setPendingCount(0); });
    return () => { cancelled = true; };
  }, [open, isSuperAdmin]);

  // Close when clicking/tapping outside the bell + dropdown
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  const handleNotificationClick = (n: AppNotification) => {
    markRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-xl transition-colors relative ${
          placement === 'sidebar'
            ? open
              ? 'text-white bg-white/20'
              : 'text-white/70 hover:text-white hover:bg-white/10'
            : open
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
            aria-label={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Transparent backdrop — closes the dropdown and blocks page interaction */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ${
            placement === 'sidebar'
              ? 'left-0 bottom-full mb-2'
              : 'right-0 top-full mt-2'
          }`}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {/* Super admin: pending registrations shortcut */}
              {isSuperAdmin && pendingCount > 0 && (
                <button
                  onClick={() => { setOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 p-2.5 mb-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <ClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="flex-1 text-left text-sm font-semibold text-amber-900">
                    {pendingCount} pending registration{pendingCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs font-medium text-amber-700">Review →</span>
                </button>
              )}

              {/* Real notifications */}
              {notifications.length > 0 ? (
                <ul className="space-y-1">
                  {notifications.map(n => (
                    <li key={n._id}>
                      <button
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                          n.read ? 'hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-50'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm ${n.read ? 'text-gray-600 font-medium' : 'text-gray-900 font-semibold'}`}>
                            {n.title}
                          </span>
                          <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</span>
                          <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              )}

              {/* System tips */}
              {tipsTotal > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-3 mb-1 px-1">
                    <span className="h-px flex-1 bg-gray-100" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">System tips</span>
                    <span className="h-px flex-1 bg-gray-100" />
                  </div>
                  <SystemNotificationsList
                    tips={visibleTips}
                    notifications={visibleNotifications}
                    dismissItem={dismissItem}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
