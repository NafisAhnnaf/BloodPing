import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, X, Monitor, Smartphone, Globe, ShieldAlert, 
  LogOut, Lock, CheckCircle2, Clock, RefreshCw, AlertCircle, Activity
} from 'lucide-react';
import { 
  sessionService, 
  ApiSessionRecord, 
  parseUserAgent, 
  formatRelativeTime, 
  formatSessionDate 
} from '../../services/sessionService';

interface SessionAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionAuditModal({ isOpen, onClose }: SessionAuditModalProps) {
  const [sessions, setSessions] = useState<ApiSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getMySessions(25);
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setError(err?.response?.data?.detail || 'Failed to load session history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      setActionError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, loadSessions]);

  if (!isOpen) return null;

  const currentSession = sessions.find(s => s.is_current) || sessions.find(s => s.is_active) || sessions[0];
  const otherSessions = sessions.filter(s => s.session_id !== currentSession?.session_id);
  const fallbackDeviceInfo = parseUserAgent(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const currentDeviceInfo = currentSession ? parseUserAgent(currentSession.user_agent) : fallbackDeviceInfo;
  const otherActiveCount = otherSessions.filter(s => s.is_active).length;

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingId(sessionId);
    setActionError(null);
    try {
      const success = await sessionService.terminateSession(sessionId);
      if (success) {
        setSessions(prev =>
          prev.map(s => (s.session_id === sessionId ? { ...s, is_active: false } : s))
        );
      }
    } catch (err: any) {
      console.error('Failed to revoke session:', err);
      setActionError(err?.response?.data?.detail || 'Failed to revoke remote session.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleConfirmLogoutAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setConfirmingLogout(true);
    setPasswordError(null);
    try {
      const count = await sessionService.terminateAllOtherSessions(password);
      setShowPasswordDialog(false);
      setPassword('');
      setSuccessMessage(`Successfully logged out of ${count} other device(s).`);
      await loadSessions();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to terminate all sessions:', err);
      setPasswordError(err?.response?.data?.detail || 'Invalid password provided.');
    } finally {
      setConfirmingLogout(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Login & Session History</h2>
              <p className="text-xs font-semibold text-slate-500">
                Audit active devices and network access logs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSessions}
              disabled={loading}
              title="Refresh sessions"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action / Success Banner */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-bold animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase animate-pulse">
                Fetching session audit logs...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 px-4 text-center flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-red-500" />
              <p className="text-sm font-bold text-slate-800">{error}</p>
              <button
                onClick={loadSessions}
                className="mt-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Current Device Section */}
              {currentSession && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      This Device (Current Session)
                    </h3>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active Now
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 shrink-0">
                      {currentDeviceInfo.deviceType === 'mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {currentDeviceInfo.deviceName}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Globe size={13} className="text-slate-400" />
                          IP: {currentSession.ip_address}
                        </span>
                        <span className="flex items-center gap-1" title={formatSessionDate(currentSession.created_at)}>
                          <Clock size={13} className="text-slate-400" />
                          Started: {formatRelativeTime(currentSession.created_at)}
                        </span>
                        <span className="flex items-center gap-1" title={formatSessionDate(currentSession.last_active_at)}>
                          <Activity size={13} className="text-slate-400" />
                          Last active: {formatRelativeTime(currentSession.last_active_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Sessions List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Other Devices & Recent Logins
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {otherSessions.filter(s => s.is_active).length} active
                  </span>
                </div>

                {otherSessions.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                    <p className="text-xs font-bold text-slate-700">No other active devices</p>
                    <p className="text-[11px] text-slate-400">
                      Your account is currently only signed in on this device.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {otherSessions.map((session) => {
                      const devInfo = parseUserAgent(session.user_agent);
                      const isRevoking = revokingId === session.session_id;

                      return (
                        <div 
                          key={session.session_id}
                          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              session.is_active 
                                ? 'bg-slate-100 text-slate-700' 
                                : 'bg-slate-50 text-slate-400 opacity-60'
                            }`}>
                              {devInfo.deviceType === 'mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-bold truncate ${session.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {devInfo.deviceName}
                                </p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  session.is_active 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {session.is_active ? 'Active' : 'Logged out'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-0.5">
                                <span>IP: {session.ip_address}</span>
                                <span>•</span>
                                <span>Last active: {formatRelativeTime(session.last_active_at)}</span>
                              </div>
                            </div>
                          </div>

                          {session.is_active && (
                            <button
                              onClick={() => handleRevokeSingle(session.session_id)}
                              disabled={isRevoking}
                              className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-500 hover:text-white text-red-600 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                            >
                              {isRevoking ? (
                                <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <>
                                  <LogOut size={13} />
                                  Revoke
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / Global Revoke Button */}
        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
          <button
            onClick={() => {
              setPasswordError(null);
              setPassword('');
              setShowPasswordDialog(true);
            }}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 disabled:opacity-50 border border-red-200 text-red-700 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all hover:shadow-sm"
          >
            <ShieldAlert size={16} />
            Log Out All Other Devices
          </button>
          <p className="text-center text-[11px] font-semibold text-slate-500">
            Revoking will immediately terminate access on all other active devices.
          </p>
        </div>
      </div>

      {/* Password Confirmation Sub-Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Lock size={24} />
            </div>
            
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">Confirm Password</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                For security, please enter your password to log out of all other devices.
              </p>
            </div>

            {passwordError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleConfirmLogoutAll} className="flex flex-col gap-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPassword('');
                    setPasswordError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmingLogout || !password.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-red-200"
                >
                  {confirmingLogout ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
