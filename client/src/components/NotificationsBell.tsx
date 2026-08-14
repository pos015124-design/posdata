import { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useSystemNotifications, SystemNotificationsList } from './SystemNotifications';

/**
 * NotificationsBell — bell button with a live unread-count badge that opens a
 * dropdown of the app's system notifications. Dismissals persist via the shared
 * useSystemNotifications hook (localStorage), so the badge and list stay in sync.
 */
export default function NotificationsBell({ placement = 'top-right' }: { placement?: 'top-right' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const { visibleTips, visibleNotifications, dismissItem, total } = useSystemNotifications();
  const containerRef = useRef<HTMLDivElement>(null);

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
        {total > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
            aria-label={`${total} unread notification${total === 1 ? '' : 's'}`}
          >
            {total}
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
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <SystemNotificationsList
                tips={visibleTips}
                notifications={visibleNotifications}
                dismissItem={dismissItem}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
