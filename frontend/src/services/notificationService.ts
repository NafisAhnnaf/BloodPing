import apiClient from './apiClient';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'application_approved' | 'application_rejected' | 'account_banned' | 'system' | string;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  payload: T;
  message: string;
}

export const notificationService = {
  /**
   * Retrieves all notifications for the authenticated user (newest first).
   */
  async getMyNotifications(): Promise<ApiResponse<NotificationItem[]>> {
    const res = await apiClient.get('/notifications/me');
    return res.data;
  },

  /**
   * Marks all unread notifications as read for the authenticated user.
   */
  async markNotificationsRead(): Promise<ApiResponse<null>> {
    const res = await apiClient.patch('/notifications/mark-read');
    return res.data;
  },
};

export default notificationService;
