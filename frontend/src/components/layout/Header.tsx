import React, { useState, useRef, useEffect } from 'react';
import { Bell, ArrowLeft, User, Lock } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationInbox } from '../ui/NotificationInbox';

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

  const [showInbox, setShowInbox] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setShowInbox(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleInbox = () => {
    setShowInbox((prev) => !prev);
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
              <div className="absolute right-0 mt-2 z-[9999]">
                <NotificationInbox onClose={() => setShowInbox(false)} />
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
