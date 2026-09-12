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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans text-slate-100">
      {/* Background Red Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-900/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/90 border border-red-900/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl z-10 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-600/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Account Suspended</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Access to BloodPing has been restricted for your account.
          </p>
        </div>

        <div className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-start gap-2 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Suspension Reason
          </span>
          <p className="text-sm font-semibold text-slate-200 leading-relaxed">
            {banReason}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 text-left flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            If you believe this suspension was issued in error or wish to appeal, please contact system administration support.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Return to Sign In</span>
        </button>
      </div>
    </div>
  );
}

export default Suspended;
