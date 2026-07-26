import React, { useState, useRef, useEffect } from 'react';
import { Crosshair, Bell, ArrowLeft, Home, Trophy, History, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { useAppData } from '../../context/AppDataContext';

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
  const location = useLocation();
  const currentPath = location.pathname;
  const { role, setRole } = useRole();
  const { notifications, markNotificationsRead } = useAppData();
  
  const hasUnread = notifications.some(n => !n.read);
  const [showInbox, setShowInbox] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setShowInbox(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleInbox = () => {
    if (!showInbox) {
      markNotificationsRead();
    }
    setShowInbox(!showInbox);
  };
  
  const navLinks = [
    { name: 'Home', path: '/dashboard' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'History', path: '/request' },
    { name: 'Profile', path: '/profile' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/20 backdrop-blur-lg border-b border-white/30 min-h-16 flex flex-col md:flex-row items-center px-4 md:px-8 py-2 md:py-0 shadow-sm gap-2 md:gap-0">
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
        <Link to="/dashboard" className="flex items-center gap-2 mr-auto md:mr-8 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center shadow-sm">
            <Crosshair size={16} className="text-white" />
          </div>
          <h1 className="font-black text-2xl !text-slate-900 tracking-tight drop-shadow-sm">BloodPing</h1>
        </Link>
      )}

      {/* Mobile Title (when no logo) */}
      {(!showLogo || showBack) && (
        <div className="flex-1 text-center md:hidden mr-auto">
          <h1 className="font-black text-xl !text-slate-900 tracking-tight drop-shadow-sm">{title}</h1>
        </div>
      )}

      {/* Role Toggle Switch */}
      <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md border border-white/60 p-1 rounded-full shadow-sm mx-auto md:mr-8">
        <button 
          onClick={() => setRole('donor')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            role === 'donor' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Donor
        </button>
        <button 
          onClick={() => setRole('recipient')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            role === 'recipient' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Recipient
        </button>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex flex-1 items-center gap-2 text-sm font-semibold">
        {navLinks.map((link) => (
          <Link 
            key={link.name} 
            to={link.path}
            className={`px-4 py-2 rounded-full transition-all border ${
              currentPath === link.path 
                ? 'bg-white/80 text-red-700 border-white/60 shadow-sm' 
                : 'bg-white/30 text-slate-700 border-transparent hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {showNotification && (
        <div className="relative ml-auto" ref={inboxRef}>
          <button 
            onClick={handleToggleInbox}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/50 transition-colors shadow-sm relative ml-auto"
          >
            <Bell size={20} className="text-red-900" />
            {hasUnread && (
              <>
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-600 rounded-full"></span>
              </>
            )}
          </button>

          {showInbox && (
            <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-black text-slate-800">Notifications</h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500 text-center py-6">No notifications yet.</p>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                      <p className="text-sm font-bold text-slate-700 leading-snug">{notif.message}</p>
                      <span className="text-xs font-medium text-slate-400 mt-1 block">
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {showBack && showNotification && <div className="w-10 md:hidden" />} 
      </div>
    </header>
  );
}
