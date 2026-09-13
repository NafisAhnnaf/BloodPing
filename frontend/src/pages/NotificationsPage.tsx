import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  BellOff, 
  CheckCheck, 
  Trash2, 
  Search, 
  Droplet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Award, 
  Check, 
  Inbox,
  Filter
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useNotifications } from '../context/NotificationContext';
import { NotificationItem } from '../services/notificationService';

function getNotificationDetails(notif: NotificationItem) {
  const lowerTitle = (notif.title || '').toLowerCase();
  const lowerMsg = (notif.message || '').toLowerCase();
  const type = notif.type || '';

  if (type === 'application_approved' || lowerTitle.includes('approved') || lowerTitle.includes('confirmed')) {
    return {
      icon: <CheckCircle2 size={20} className="text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      category: 'Approvals',
    };
  }
  if (type === 'application_rejected' || lowerTitle.includes('rejected') || lowerTitle.includes('withdrew')) {
    return {
      icon: <XCircle size={20} className="text-rose-600" />,
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      category: 'Updates',
    };
  }
  if (type === 'account_banned' || lowerTitle.includes('banned') || lowerTitle.includes('revoked')) {
    return {
      icon: <AlertTriangle size={20} className="text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      category: 'Security',
    };
  }
  if (lowerTitle.includes('point') || lowerMsg.includes('point') || lowerTitle.includes('streak')) {
    return {
      icon: <Award size={20} className="text-amber-500" />,
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      category: 'Rewards',
    };
  }
  if (lowerTitle.includes('donor') || lowerTitle.includes('blood') || lowerTitle.includes('request')) {
    return {
      icon: <Droplet size={20} className="text-red-600 fill-red-600" />,
      bg: 'bg-red-50 border-red-200 text-red-800',
      category: 'Donations',
    };
  }

  return {
    icon: <Bell size={20} className="text-indigo-600" />,
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    category: 'System',
  };
}

function formatTime(dateString: string): { relative: string; full: string } {
  if (!dateString) return { relative: '', full: '' };
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let relative = 'Just now';
  if (diffSec >= 45 && diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffMin >= 60 && diffHour < 24) relative = `${diffHour}h ago`;
  else if (diffDay === 1) relative = 'Yesterday';
  else if (diffDay > 1 && diffDay < 7) relative = `${diffDay}d ago`;
  else if (diffDay >= 7) relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return {
    relative,
    full: date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

type FilterCategory = 'all' | 'unread' | 'donations' | 'rewards' | 'system';

export function NotificationsPage() {
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

  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadSnapshot, setUnreadSnapshot] = useState<NotificationItem[]>([]);

  const handleTabChange = async (tab: FilterCategory) => {
    if (tab === 'unread') {
      const unread = notifications.filter((n) => !n.is_read);
      setUnreadSnapshot(unread);
      setActiveTab('unread');
      if (unread.length > 0) {
        // Automatically read unread notifications when entering unread toggle
        await markAllAsRead();
      }
    } else {
      setActiveTab(tab);
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = activeTab === 'unread' ? unreadSnapshot : notifications;

    // Filter by category
    if (activeTab === 'donations') {
      list = list.filter((n) => {
        const title = (n.title || '').toLowerCase();
        return title.includes('donor') || title.includes('blood') || title.includes('request') || title.includes('application');
      });
    } else if (activeTab === 'rewards') {
      list = list.filter((n) => {
        const title = (n.title || '').toLowerCase();
        const msg = (n.message || '').toLowerCase();
        return title.includes('point') || msg.includes('point') || title.includes('streak');
      });
    } else if (activeTab === 'system') {
      list = list.filter((n) => {
        const title = (n.title || '').toLowerCase();
        return n.type === 'system' && !title.includes('point') && !title.includes('blood') && !title.includes('donor');
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, unreadSnapshot, notifications, searchQuery]);

  // Group chronologically
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationItem[] } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    filteredNotifications.forEach((item) => {
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
  }, [filteredNotifications]);

  return (
    <div className="min-h-screen font-sans">
      <Header showBack={true} onBack={() => navigate(-1)} title="Notifications" />

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Hero Banner */}
        <section className="bg-gradient-to-br from-rose-500 via-red-600 to-amber-600 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3 border border-white/30">
              <Bell size={14} />
              <span>Notification Center</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              Notifications & Alerts
            </h1>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-lg">
              Manage all real-time alerts for donation requests, application responses, milestone rewards, and platform announcements.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-4 justify-center md:justify-start">
              <span className="px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                {notifications.length} Total
              </span>
              {unreadCount > 0 ? (
                <span className="px-3 py-1 rounded-xl bg-white text-red-600 text-xs font-black shadow-sm">
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md text-xs font-bold text-white/80 border border-white/20">
                  All Caught Up
                </span>
              )}
            </div>
          </div>

          {/* Banner Quick Actions */}
          <div className="relative z-10 flex items-center gap-2 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/30">
            <button
              onClick={toggleSound}
              title={isSoundMuted ? 'Unmute chime' : 'Mute chime'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              {isSoundMuted ? <BellOff size={16} /> : <Bell size={16} />}
              <span className="hidden sm:inline">{isSoundMuted ? 'Muted' : 'Sound On'}</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                title="Mark all notifications as read"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <CheckCheck size={16} />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all notifications?')) {
                    clearAllNotifications();
                  }
                }}
                title="Clear all notifications"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </section>

        {/* Search & Filter Controls */}
        <section className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword..."
              className="w-full bg-white/70 backdrop-blur-md border border-white/80 text-slate-900 rounded-2xl py-3 pl-11 pr-4 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 shadow-sm"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/60'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => handleTabChange('unread')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/60'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-red-600 text-[10px] font-black">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('donations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'donations'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/60'
              }`}
            >
              Donations
            </button>

            <button
              onClick={() => handleTabChange('rewards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'rewards'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/60'
              }`}
            >
              Rewards
            </button>

            <button
              onClick={() => handleTabChange('system')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/60'
              }`}
            >
              System
            </button>
          </div>
        </section>

        {/* Stacked Chronological List */}
        <section className="flex flex-col gap-6">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <Inbox size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">
                {activeTab === 'unread' ? 'All caught up!' : 'No notifications found'}
              </h3>
              <p className="text-xs md:text-sm font-medium text-slate-500 max-w-sm">
                {searchQuery
                  ? 'No notifications matched your search query. Try clearing the search bar.'
                  : activeTab === 'unread'
                  ? 'You have read all of your notifications.'
                  : 'Any new activity or updates will appear here in real time.'}
              </p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([groupTitle, items]) => {
              if (items.length === 0) return null;

              return (
                <div key={groupTitle} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                      {groupTitle}
                    </span>
                    <div className="flex-1 h-px bg-slate-200/80" />
                    <span className="text-xs font-bold text-slate-400">
                      {items.length} {items.length === 1 ? 'alert' : 'alerts'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {items.map((notif) => {
                      const { icon, bg, category } = getNotificationDetails(notif);
                      const { relative, full } = formatTime(notif.created_at);

                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.is_read) {
                              markAsRead(notif.id);
                            }
                          }}
                          className={`group relative bg-white/90 backdrop-blur-md rounded-2xl border p-4 md:p-5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                            !notif.is_read
                              ? 'border-red-200/80 bg-red-50/30'
                              : 'border-white/80 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon Badge */}
                            <div className={`p-3 rounded-2xl border shadow-xs flex-shrink-0 ${bg}`}>
                              {icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {category}
                                  </span>
                                  <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                    {notif.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs font-bold text-slate-400"
                                    title={full}
                                  >
                                    {relative}
                                  </span>
                                  {!notif.is_read && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-100/80 px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                      New
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs md:text-sm font-medium text-slate-700 leading-relaxed break-words mt-1">
                                {notif.message}
                              </p>

                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/80 text-[11px] text-slate-400">
                                <span>{full}</span>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.is_read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notif.id);
                                      }}
                                      className="text-slate-600 hover:text-emerald-700 font-bold flex items-center gap-1 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                      title="Mark as read"
                                    >
                                      <Check size={14} className="text-emerald-600" />
                                      <span>Mark read</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notif.id);
                                    }}
                                    className="text-slate-600 hover:text-rose-600 font-bold flex items-center gap-1 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Delete notification"
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
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
        </section>
      </main>
    </div>
  );
}
