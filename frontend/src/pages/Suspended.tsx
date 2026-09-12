import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, LogOut, AlertTriangle, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabaseClient';

export function Suspended() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [banReason, setBanReason] = useState<string>('Account suspended by administrator.');

  useEffect(() => {
    const reasonFromQuery = searchParams.get('reason');
    const reasonFromStorage = localStorage.getItem('ban_reason');
    if (reasonFromQuery) {
      setBanReason(reasonFromQuery);
    } else if (reasonFromStorage) {
      setBanReason(reasonFromStorage);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    localStorage.removeItem('ban_reason');
    useAuthStore.getState().clearSession();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-rose-100 to-red-200 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans text-slate-900 antialiased">
      {/* Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-white/85 border border-white/60 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-rose-950/10 z-10 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-red-100 border border-red-200 flex items-center justify-center shadow-lg shadow-red-500/15 text-red-600">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Suspended</h1>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Access to BloodPing has been restricted for your account.
          </p>
        </div>

        <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col items-start gap-2 text-left shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Suspension Reason
          </span>
          <p className="text-sm font-bold text-slate-800 leading-relaxed">
            {banReason}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left flex items-start gap-3 shadow-inner">
          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            If you believe this suspension was issued in error or wish to appeal, please contact system administration support.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Return to Sign In</span>
        </button>
      </div>
    </div>
  );
}

export default Suspended;
