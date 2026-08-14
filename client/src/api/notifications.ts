import api from './api';

export interface AppNotification {
  _id: string;
  type: 'order' | 'sale' | 'approval' | 'suspension' | 'low_stock' | 'system' | string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// GET /api/notifications?limit=20 → { success, notifications, unreadCount }
export const getNotifications = async (limit = 20) => {
  const response = await api.get(`/api/notifications?limit=${limit}`);
  return response.data;
};

// GET /api/notifications/unread-count → { success, unreadCount }
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/api/notifications/unread-count');
  return response.data?.unreadCount ?? 0;
};

// PUT /api/notifications/:id/read
export const markNotificationRead = async (id: string) => {
  const response = await api.put(`/api/notifications/${id}/read`);
  return response.data;
};

// PUT /api/notifications/read-all
export const markAllNotificationsRead = async () => {
  const response = await api.put('/api/notifications/read-all');
  return response.data;
};

// GET /api/auth/pending-users → count of registrations awaiting admin approval
// (super_admin only — the endpoint itself enforces the role)
export const getPendingUserCount = async (): Promise<number> => {
  const response = await api.get('/api/auth/pending-users');
  return Array.isArray(response.data?.users) ? response.data.users.length : 0;
};
