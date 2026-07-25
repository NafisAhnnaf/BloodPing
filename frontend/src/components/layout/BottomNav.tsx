import React from 'react';
import { Home, Trophy, History, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, to: '/' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, to: '/leaderboard' },
    { id: 'history', label: 'History', icon: History, to: '/request' },
    { id: 'profile', label: 'Profile', icon: User, to: '/profile' }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-3 bg-white/80 backdrop-blur-xl border-t border-white/40 shadow-[0_-8px_30px_rgba(200,25,47,0.1)] pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.to;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            className={`flex flex-col items-center justify-center py-2 transition-all ${
              isActive 
                ? 'bg-red-100 text-red-700 rounded-2xl px-5' 
                : 'text-red-900/50 hover:text-red-700'
            }`}
          >
            <Icon size={22} className="mb-1" />
            <span className="text-[11px] font-bold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
