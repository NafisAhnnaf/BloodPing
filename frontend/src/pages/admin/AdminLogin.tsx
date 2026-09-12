import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Droplet, ArrowLeft } from 'lucide-react';
import adminService from '../../services/adminService';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await adminService.adminLogin(email, password);
      if (response.success && response.payload?.access_token) {
        localStorage.setItem('admin_token', response.payload.access_token);
        if (response.payload.user) {
          localStorage.setItem('admin_user', JSON.stringify(response.payload.user));
        }
        navigate('/admin/dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      const detail = err.response?.data?.detail || err.message || 'Invalid administrator credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-rose-100 to-red-200 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans text-slate-900 antialiased">
      {/* Dynamic Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-2xl shadow-rose-950/10 z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/25 mb-4 text-white">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <Droplet size={22} className="text-red-600 fill-red-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Console</h1>
          </div>
          <p className="text-slate-500 text-xs font-bold">
            BloodPing Administrator Control Panel
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-600 text-xs font-bold leading-relaxed shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                className="w-full bg-white/90 border-2 border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white/90 border-2 border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Admin Console</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-red-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to User Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
