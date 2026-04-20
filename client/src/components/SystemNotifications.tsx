import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  X,
  Info
} from 'lucide-react';

interface SystemTip {
  id: string;
  type: 'tip' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  dismissible: boolean;
  showAfterDays: number;
}

interface SystemNotification {
  id: string;
  type: 'tip' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  dismissible: boolean;
  showAfterDays: number;
}

// System tips and notifications
const systemTips: SystemTip[] = [
  {
    id: 'tip-pos-shortcut',
    type: 'tip',
    title: 'POS Shortcut Tip',
    message: 'Press Ctrl+K to quickly search for products in the POS system',
    category: 'pos',
    priority: 'low',
    dismissible: true,
    showAfterDays: 0
  },
  {
    id: 'tip-inventory-alerts',
    type: 'tip',
    title: 'Inventory Management',
    message: 'Set reorder points for products to get automatic low stock alerts',
    category: 'inventory',
    priority: 'medium',
    dismissible: true,
    showAfterDays: 1
  },
  {
    id: 'tip-daily-reports',
    type: 'tip',
    title: 'Daily Reports',
    message: 'Generate daily sales reports every evening to track your business performance',
    category: 'reports',
    priority: 'low',
    dismissible: true,
    showAfterDays: 2
  },
  {
    id: 'tip-security',
    type: 'tip',
    title: 'Security Best Practice',
    message: 'Regularly update your password and enable 2FA if available',
    category: 'security',
    priority: 'high',
    dismissible: true,
    showAfterDays: 0
  }
];

const systemNotifications: SystemNotification[] = [
  {
    id: 'notification-backup',
    type: 'info',
    title: 'Backup Reminder',
    message: 'Remember to backup your data regularly to prevent data loss',
    priority: 'medium',
    dismissible: true,
    showAfterDays: 7
  },
  {
    id: 'notification-update',
    type: 'warning',
    title: 'System Update Available',
    message: 'A new version of the system is available with enhanced features',
    priority: 'high',
    dismissible: true,
    showAfterDays: 0
  }
];

export const SystemNotifications = () => {
  const [visibleTips, setVisibleTips] = useState<SystemTip[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<SystemNotification[]>([]);
  const [dismissedItems, setDismissedItems] = useState<string[]>([]);

  // Load dismissed items from localStorage
  useEffect(() => {
    const savedDismissed = JSON.parse(localStorage.getItem('dismissed-notifications') || '[]') as string[];
    setDismissedItems(savedDismissed);
  }, []);

  // Filter and show relevant tips and notifications
  useEffect(() => {
    const now = new Date();
    const userJoinDateString = localStorage.getItem('user-join-date') || now.toISOString();
    const userJoinDate = new Date(userJoinDateString);
    
    // Calculate days since user joined
    const daysSinceJoin = Math.floor((now.getTime() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24));

    // Filter tips based on days since join and dismissal status
    const filteredTips = systemTips.filter(tip => {
      const shouldShow = daysSinceJoin >= tip.showAfterDays && !dismissedItems.includes(tip.id);
      return shouldShow;
    });

    // Filter notifications based on days since join and dismissal status
    const filteredNotifications = systemNotifications.filter(notification => {
      const shouldShow = daysSinceJoin >= notification.showAfterDays && !dismissedItems.includes(notification.id);
      return shouldShow;
    });

    setVisibleTips(filteredTips);
    setVisibleNotifications(filteredNotifications);
  }, [dismissedItems]);

  // Dismiss an item
  const dismissItem = (id: string) => {
    const updatedDismissed = [...dismissedItems, id];
    setDismissedItems(updatedDismissed);
    localStorage.setItem('dismissed-notifications', JSON.stringify(updatedDismissed));
  };

  // Get icon based on type
  const getIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get badge variant based on priority
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-3">
      {/* System Tips */}
      {visibleTips.map((tip) => (
        <Alert key={tip.id} className="relative">
          <div className="flex items-start gap-3">
            {getIcon(tip.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium text-sm">{tip.title}</h5>
                <Badge variant={getPriorityVariant(tip.priority)} className="text-xs">
                  {tip.priority}
                </Badge>
              </div>
              <AlertDescription className="text-sm">
                {tip.message}
              </AlertDescription>
            </div>
            {tip.dismissible && (
              <div className="flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismissItem(tip.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </Alert>
      ))}

      {/* System Notifications */}
      {visibleNotifications.map((notification) => (
        <Alert 
          key={notification.id} 
          className={`relative ${
            notification.priority === 'high' ? 'border-destructive/50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium text-sm">{notification.title}</h5>
                <Badge variant={getPriorityVariant(notification.priority)} className="text-xs">
                  {notification.priority}
                </Badge>
              </div>
              <AlertDescription className="text-sm">
                {notification.message}
              </AlertDescription>
            </div>
            {notification.dismissible && (
              <div className="flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismissItem(notification.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </Alert>
      ))}

      {/* Empty state when no notifications */}
      {visibleTips.length === 0 && visibleNotifications.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notifications or tips at this time</p>
        </div>
      )}
    </div>
  );
};

export default SystemNotifications;