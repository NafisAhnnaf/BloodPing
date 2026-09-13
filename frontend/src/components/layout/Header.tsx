import React, { useState, useRef, useEffect } from 'react';
import { Bell, ArrowLeft, User, Lock } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import notificationService, { NotificationItem } from '../../services/notificationService';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  showNotification?: boolean;
  notificationPulse?: boolean;
}

export function Header({
  title = 'BloodPing',
  showBack = false,
  onBack,
  showLogo = true,
  showNotification = true
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { role, setRole, systemRole, isDonorApproved } = useRole();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getMyNotifications();
      if (res.success && Array.isArray(res.payload)) {
        setNotifications(res.payload);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setShowInbox(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleInbox = async () => {
    const nextState = !showInbox;
    setShowInbox(nextState);
    if (nextState && hasUnread) {
      try {
        await notificationService.markNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch (err) {
        console.warn('Failed to mark notifications as read:', err);
      }
    }
  };

  const navLinks = [
    { name: 'Feed', path: '/feed' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'History', path: '/history' },
  ];

  if (systemRole === 'admin') {
    navLinks.push({ name: 'Admin', path: '/admin' });
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/20 backdrop-blur-lg border-b border-white/30 min-h-16 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-2 md:py-0 shadow-sm gap-3 md:gap-0 font-sans">
      {/* LEFT: Logo & Back Button */}
      <div className="flex items-center w-full md:w-auto">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm mr-3"
          >
            <ArrowLeft size={20} className="text-red-900" />
          </button>
        )}

        {showLogo && !showBack && (
          <Link to="/feed" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/3.png" alt="BloodPing Logo" className="h-10 md:h-20 w-auto object-contain drop-shadow-sm" />
            <h1 className="font-black text-2xl !text-slate-900 tracking-tight drop-shadow-sm">Blood<span className='text-red-700'>Ping</span></h1>
          </Link>
        )}

        {/* Mobile Title (when no logo) */}
        {(!showLogo || showBack) && (
          <div className="flex-1 text-center md:hidden mr-auto">
            <h1 className="font-black text-xl !text-slate-900 tracking-tight drop-shadow-sm">{title}</h1>
          </div>
        )}
      </div>

      {/* CENTER: Desktop Nav */}
      <nav className="hidden md:flex flex-1 justify-center items-center gap-4 text-sm font-semibold">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`px-5 py-2 rounded-full transition-all border ${currentPath === link.path
              ? 'bg-white/80 text-red-700 border-white/60 shadow-sm'
              : 'bg-white/30 text-slate-700 border-transparent hover:bg-white/60 hover:text-slate-900'
              }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {/* RIGHT: Role Toggle & Notifications */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md border border-white/60 p-1 rounded-full shadow-sm">
          <button
            onClick={async () => {
              if (!isDonorApproved) {
                navigate('/become-donor');
                return;
              }
              await setRole('donor');
            }}
            title={!isDonorApproved ? "You are not a registered donor yet. Click to register." : "Switch to Donor view"}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${role === 'donor'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>Donor</span>
            {!isDonorApproved && (
              <Lock size={12} className="text-amber-600 flex-shrink-0" />
            )}
          </button>
          <button
            onClick={() => setRole('recipient')}
            title="Switch to Recipient view"
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${role === 'recipient'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Recipient
          </button>
        </div>

        {showNotification && (
          <div className="relative" ref={inboxRef}>
            <button
              onClick={handleToggleInbox}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/50 transition-colors shadow-sm relative"
            >
              <Bell size={20} className="text-red-900" />
              {hasUnread && (
                <>
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                  <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-600 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : ''}
                  </span>
                </>
              )}
            </button>

            {showInbox && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs font-medium text-slate-500 text-center py-6">No notifications yet.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-xl transition-colors border-b border-slate-100 last:border-0 ${!notif.is_read ? 'bg-red-50/40' : 'hover:bg-slate-50'
                          }`}
                      >
                        <h4 className="text-xs font-black text-slate-800 mb-0.5">{notif.title}</h4>
                        <p className="text-xs font-medium text-slate-600 leading-snug">{notif.message}</p>
                        <span className="text-[10px] font-bold text-slate-400 mt-1.5 block">
                          {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Link
            to="/profile"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/50 transition-colors shadow-sm relative"
          >
            <User size={20} className="text-red-900" />
          </Link>
        </div>
      </div>
    </header>
  );
}
