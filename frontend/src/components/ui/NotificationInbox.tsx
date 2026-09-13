import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Droplet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Bell, 
  BellOff, 
  CheckCheck, 
  Trash2, 
  Check, 
  Inbox,
  ArrowRight
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../services/notificationService';

function getNotificationIcon(notif: NotificationItem) {
  const lowerTitle = (notif.title || '').toLowerCase();
  const lowerMsg = (notif.message || '').toLowerCase();
  const type = notif.type || '';

  if (type === 'application_approved' || lowerTitle.includes('approved') || lowerTitle.includes('confirmed')) {
    return {
      icon: <CheckCircle2 size={16} className="text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    };
  }
  if (type === 'application_rejected' || lowerTitle.includes('rejected') || lowerTitle.includes('withdrew')) {
    return {
      icon: <XCircle size={16} className="text-rose-600" />,
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
    };
  }
  if (type === 'account_banned' || lowerTitle.includes('banned') || lowerTitle.includes('revoked')) {
    return {
      icon: <AlertTriangle size={16} className="text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
    };
  }
  if (lowerTitle.includes('donor') || lowerTitle.includes('blood') || lowerTitle.includes('request')) {
    return {
      icon: <Droplet size={16} className="text-red-600 fill-red-600" />,
      bg: 'bg-red-50 border-red-200 text-red-800',
    };
  }

  return {
    icon: <Bell size={16} className="text-indigo-600" />,
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupNotificationsByDate(items: NotificationItem[]) {
  const groups: { [key: string]: NotificationItem[] } = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  items.forEach((item) => {
    const time = item.created_at ? new Date(item.created_at).getTime() : 0;
    if (time >= todayStart) {
      groups.Today.push(item);
    } else if (time >= yesterdayStart) {
      groups.Yesterday.push(item);
    } else {
      groups.Earlier.push(item);
    }
  });

  return groups;
}

interface NotificationInboxProps {
  onClose?: () => void;
}

export function NotificationInbox({ onClose }: NotificationInboxProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    isSoundMuted,
    toggleSound,
  } = useNotifications();

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [unreadSnapshot, setUnreadSnapshot] = useState<NotificationItem[]>([]);

  const handleTabChange = async (nextTab: 'all' | 'unread') => {
    if (nextTab === 'unread') {
      // Capture unread notifications so they stay visible in the list while being automatically marked as read
      const unread = notifications.filter((n) => !n.is_read);
      setUnreadSnapshot(unread);
      setTab('unread');
      if (unread.length > 0) {
        // Automatically read unread messages when entering the unread toggle without manual verification
        await markAllAsRead();
      }
    } else {
      setTab('all');
    }
  };

  const filteredItems = tab === 'unread' ? unreadSnapshot : notifications;
  const grouped = groupNotificationsByDate(filteredItems);

  return (
    <div className="w-88 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-800 text-sm tracking-tight">Notifications</h3>
          {unreadCount > 0 ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
              {unreadCount} New
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {notifications.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'Unmute notification chime' : 'Mute notification chime'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            {isSoundMuted ? <BellOff size={15} className="text-slate-400" /> : <Bell size={15} className="text-red-600" />}
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              title="Mark all as read"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <CheckCheck size={15} />
            </button>
          )}

          {/* Clear All */}
          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all notifications?')) {
                  clearAllNotifications();
                }
              }}
              title="Clear all notifications"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-100 px-4 pt-2 bg-white gap-3">
        <button
          onClick={() => handleTabChange('all')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            tab === 'all'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => handleTabChange('unread')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            tab === 'unread'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Body: Stacked List */}
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100/80">
        {filteredItems.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <Inbox size={24} />
            </div>
            <p className="text-xs font-bold text-slate-700">
              {tab === 'unread' ? 'All caught up!' : 'No notifications yet.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tab === 'unread'
                ? 'You have no unread notifications.'
                : 'Real-time updates will stack right here.'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={groupTitle} className="p-2">
                <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {groupTitle}
                </div>
                <div className="flex flex-col gap-1 mt-0.5">
                  {items.map((notif) => {
                    const { icon, bg } = getNotificationIcon(notif);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) {
                            markAsRead(notif.id);
                          }
                        }}
                        className={`group relative p-3 rounded-xl transition-all border cursor-pointer ${
                          !notif.is_read
                            ? 'bg-red-50/40 border-red-100 hover:bg-red-50/70'
                            : 'bg-white border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl border flex-shrink-0 shadow-xs ${bg}`}>
                            {icon}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">
                                {notif.title}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                                {formatRelativeTime(notif.created_at)}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-slate-600 leading-snug break-words">
                              {notif.message}
                            </p>

                            {/* Unread indicator */}
                            {!notif.is_read && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                New
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons on Hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                            {!notif.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                }}
                                title="Mark as read"
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors shadow-xs cursor-pointer"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              title="Delete notification"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white transition-colors shadow-xs cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: View All Notifications Button */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-center">
        <button
          onClick={() => {
            onClose?.();
            navigate('/notifications');
          }}
          className="w-full text-xs font-black text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100/90 border border-red-200/60 py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-sm"
        >
          <span>View All Notifications</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
