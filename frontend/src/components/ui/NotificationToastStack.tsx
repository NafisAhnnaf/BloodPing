import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Bell, 
  X, 
  Check, 
  Award,
  Layers
} from 'lucide-react';
import { useNotifications, ToastItem } from '../../context/NotificationContext';
import { NotificationItem } from '../../services/notificationService';

function getNotificationIcon(notif: NotificationItem) {
  const lowerTitle = (notif.title || '').toLowerCase();
  const lowerMsg = (notif.message || '').toLowerCase();
  const type = notif.type || '';

  if (type === 'application_approved' || lowerTitle.includes('approved') || lowerTitle.includes('confirmed')) {
    return {
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      bg: 'bg-emerald-100/80 border-emerald-200 text-emerald-800',
      accent: 'bg-emerald-500',
    };
  }
  if (type === 'application_rejected' || lowerTitle.includes('rejected') || lowerTitle.includes('withdrew')) {
    return {
      icon: <XCircle size={18} className="text-rose-600" />,
      bg: 'bg-rose-100/80 border-rose-200 text-rose-800',
      accent: 'bg-rose-500',
    };
  }
  if (type === 'account_banned' || lowerTitle.includes('banned') || lowerTitle.includes('revoked')) {
    return {
      icon: <AlertTriangle size={18} className="text-amber-600" />,
      bg: 'bg-amber-100/80 border-amber-200 text-amber-800',
      accent: 'bg-amber-500',
    };
  }
  if (lowerTitle.includes('point') || lowerMsg.includes('point') || lowerTitle.includes('streak')) {
    return {
      icon: <Award size={18} className="text-amber-500" />,
      bg: 'bg-amber-100/80 border-amber-200 text-amber-800',
      accent: 'bg-amber-500',
    };
  }
  if (lowerTitle.includes('donor') || lowerTitle.includes('blood') || lowerTitle.includes('request')) {
    return {
      icon: <Droplet size={18} className="text-red-600 fill-red-600" />,
      bg: 'bg-red-100/80 border-red-200 text-red-800',
      accent: 'bg-red-600',
    };
  }

  return {
    icon: <Bell size={18} className="text-indigo-600" />,
    bg: 'bg-indigo-100/80 border-indigo-200 text-indigo-800',
    accent: 'bg-indigo-600',
  };
}

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}

function SingleToast({ toast, onDismiss, onMarkRead }: SingleToastProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.durationMs);

  const { icon, bg, accent } = getNotificationIcon(toast.notification);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const totalDuration = remainingTimeRef.current;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setProgress(pct);

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, toast.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-xl shadow-slate-900/10 p-4 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer group pointer-events-auto"
      onClick={() => onMarkRead(toast.id)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl border flex-shrink-0 shadow-sm ${bg}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h5 className="text-xs font-black text-slate-800 tracking-tight truncate">
              {toast.notification.title}
            </h5>
            <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
              Just now
            </span>
          </div>
          <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">
            {toast.notification.message}
          </p>

          <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(toast.id);
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              <Check size={12} className="text-emerald-600" />
              Mark as read
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-medium text-slate-400">
              Click to dismiss
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          title="Dismiss toast"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className={`h-full transition-all duration-75 ease-linear ${accent}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function NotificationToastStack() {
  const { toasts, dismissToast, dismissAllToasts, markAsRead } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-none max-w-sm w-[calc(100vw-3rem)]"
    >
      {toasts.length > 2 && (
        <button
          onClick={dismissAllToasts}
          className="pointer-events-auto text-xs font-black bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all hover:scale-105"
        >
          <Layers size={13} />
          Dismiss All ({toasts.length})
        </button>
      )}

      <div className="flex flex-col gap-2.5 w-full">
        {toasts.map((toast) => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onMarkRead={markAsRead}
          />
        ))}
      </div>
    </aside>
  );
}
