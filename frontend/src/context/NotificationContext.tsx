import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import notificationService, { NotificationItem } from '../services/notificationService';
import { playNotificationSound, isNotificationSoundMuted, setNotificationSoundMuted } from '../utils/notificationSound';

export interface ToastItem {
  id: string;
  notification: NotificationItem;
  createdAt: number;
  durationMs: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  toasts: ToastItem[];
  isSoundMuted: boolean;
  toggleSound: () => void;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  sendTestNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMutedState] = useState<boolean>(() => isNotificationSoundMuted());

  // Track notifications that have already triggered a toast to prevent duplicate toasts
  const toastedNotificationIds = useRef<Set<string>>(new Set());

  const toggleSound = useCallback(() => {
    setIsSoundMutedState((prev) => {
      const next = !prev;
      setNotificationSoundMuted(next);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showLiveToast = useCallback((notif: NotificationItem, durationMs = 6000) => {
    if (toastedNotificationIds.current.has(notif.id)) return;
    toastedNotificationIds.current.add(notif.id);

    const newToast: ToastItem = {
      id: notif.id,
      notification: notif,
      createdAt: Date.now(),
      durationMs,
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep maximum 5 stacked toasts
  }, []);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isAuthenticated || !user) return;
    if (!isSilent) setIsLoading(true);

    try {
      const res = await notificationService.getMyNotifications();
      if (res.success && Array.isArray(res.payload)) {
        setNotifications((prev) => {
          // If this is a background poll and we find new unread notifications that arrived recently, toast them
          if (prev.length > 0) {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = res.payload.filter((item) => !existingIds.has(item.id));
            if (newItems.length > 0) {
              newItems.forEach((item) => {
                if (!item.is_read) {
                  showLiveToast(item);
                  playNotificationSound();
                }
              });
            }
          }
          return res.payload;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [isAuthenticated, user, showLiveToast]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('Failed to mark notifications as read:', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markSingleRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      dismissToast(id);
    } catch (err) {
      console.warn(`Failed to mark notification ${id} as read:`, err);
    }
  }, [dismissToast]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      dismissToast(id);
    } catch (err) {
      console.warn(`Failed to delete notification ${id}:`, err);
    }
  }, [dismissToast]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
      dismissAllToasts();
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  }, [dismissAllToasts]);

  const sendTestNotification = useCallback(async () => {
    try {
      const res = await notificationService.sendTestNotification();
      if (res.success && res.payload) {
        const item = res.payload;
        setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
        showLiveToast(item);
        playNotificationSound();
      }
    } catch (err) {
      console.warn('Failed to send test notification:', err);
    }
  }, [showLiveToast]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setToasts([]);
      toastedNotificationIds.current.clear();
    }
  }, [isAuthenticated, user?.id, fetchNotifications]);

  // Real-time Supabase Subscription & Fallback Poller
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // 1. Subscribe to Postgres changes on notifications table for the user
    const channelName = `realtime-notifications-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as NotificationItem;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            showLiveToast(newNotif);
            playNotificationSound();
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as NotificationItem;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setNotifications((prev) => prev.filter((n) => n.id !== String(deletedId)));
              dismissToast(String(deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Notifications] Real-time channel active.');
        }
      });

    // 2. Periodic poll fallback (every 25s) to guarantee updates
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 25000);

    // 3. Tab visibility / focus refetch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.id, showLiveToast, dismissToast, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        toasts,
        isSoundMuted,
        toggleSound,
        fetchNotifications,
        markAllAsRead,
        markAsRead,
        deleteNotification,
        clearAllNotifications,
        dismissToast,
        dismissAllToasts,
        sendTestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
