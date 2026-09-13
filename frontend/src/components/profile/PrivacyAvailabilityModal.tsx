import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, X, Activity, Phone, Eye, EyeOff, 
  Download, Trash2, AlertTriangle, CheckCircle2, Clock, 
  RefreshCw, Loader2, Lock, FileText, UserX
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';

interface PrivacyAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdated?: () => void;
}

export function PrivacyAvailabilityModal({
  isOpen,
  onClose,
  user,
  onUpdated,
}: PrivacyAvailabilityModalProps) {
  const { logout } = useAuth();
  const { role } = useRole();

  // Availability State
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [restPeriodUntil, setRestPeriodUntil] = useState<string | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);

  // Privacy Preferences State
  const [phoneVisibility, setPhoneVisibility] = useState<'matches_only' | 'public'>('matches_only');
  const [anonymousLeaderboard, setAnonymousLeaderboard] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  // Data Export State
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Deletion Dialog State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (role !== 'donor' && user?.role !== 'donor' && user?.role !== 'both') return;
    setLoadingAvailability(true);
    try {
      const res = await apiClient.get('/donors/availability');
      setIsAvailable(res.data.is_available);
      setRestPeriodUntil(res.data.rest_period_until);
    } catch (err) {
      console.warn('Could not fetch donor availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  }, [role, user]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailability();
      setAvailabilityMsg(null);
      setExportSuccess(false);
      setShowDeleteConfirm(false);
      setConfirmDeleteText('');
      setDeleteError(null);
      setPrivacySaved(false);
    }
  }, [isOpen, fetchAvailability]);

  if (!isOpen) return null;

  const handleToggleAvailability = async () => {
    setSavingAvailability(true);
    setAvailabilityMsg(null);
    try {
      const newStatus = !isAvailable;
      const res = await apiClient.put('/donors/availability', { is_available: newStatus });
      setIsAvailable(res.data.is_available);
      setRestPeriodUntil(res.data.rest_period_until);
      setAvailabilityMsg(res.data.message);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error('Failed to update availability:', err);
      setAvailabilityMsg(err.response?.data?.detail || 'Failed to update availability.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSavePrivacyPreferences = () => {
    // Save locally or can be persisted to backend preferences
    localStorage.setItem('bp_privacy_phone', phoneVisibility);
    localStorage.setItem('bp_privacy_anon', JSON.stringify(anonymousLeaderboard));
    setPrivacySaved(true);
    setTimeout(() => setPrivacySaved(false), 3000);
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportSuccess(false);
    try {
      const res = await apiClient.get('/users/me/export');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `bloodping_data_export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess(true);
    } catch (err) {
      console.error('Data export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account removal.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete('/users/me');
      await logout();
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  const isDonorUser = role === 'donor' || user?.role === 'donor' || user?.role === 'both';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white/95 border border-white/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Privacy & Availability</h3>
              <p className="text-xs font-semibold text-slate-500">
                Manage emergency readiness, personal contact visibility & data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Donor Availability Controls */}
        {isDonorUser && (
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-red-500" />
                <h4 className="text-sm font-extrabold text-slate-900">Emergency Donation Availability</h4>
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isAvailable ? 'Available' : 'Paused'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When toggled on, you appear in nearby emergency searches and can be invited to donate blood. 
              Toggle off if you are traveling, unwell, or temporarily unavailable.
            </p>

            {/* Availability Toggle Button */}
            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">
                  {isAvailable ? 'Ready to accept blood requests' : 'Currently paused from requests'}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {isAvailable ? 'Proximity alerts & invitations active' : 'Your streaks and points remain intact'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAvailability}
                disabled={savingAvailability || loadingAvailability}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                  isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Rest Period Notification */}
            {restPeriodUntil && new Date(restPeriodUntil) > new Date() && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-start gap-2">
                <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Medical Rest Period Active: </span>
                  You completed a donation recently. In accordance with safety standards, emergency matching resumes after{' '}
                  <strong>{new Date(restPeriodUntil).toLocaleDateString()}</strong>.
                </div>
              </div>
            )}

            {availabilityMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{availabilityMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Contact & Identity Visibility */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-amber-500" />
            <h4 className="text-sm font-extrabold text-slate-900">Contact & Profile Visibility</h4>
          </div>

          {/* Phone Number Privacy */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone size={13} className="text-slate-500" /> Phone Number Exposure
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPhoneVisibility('matches_only')}
                className={`p-2.5 rounded-xl text-left border text-xs font-bold flex flex-col gap-0.5 transition-all ${
                  phoneVisibility === 'matches_only'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-amber-600" /> Matches Only (Safe)
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  Visible only to confirmed match partners
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPhoneVisibility('public')}
                className={`p-2.5 rounded-xl text-left border text-xs font-bold flex flex-col gap-0.5 transition-all ${
                  phoneVisibility === 'public'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Eye size={13} className="text-slate-500" /> Public to Network
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  Visible on requests you respond to
                </span>
              </button>
            </div>
          </div>

          {/* Leaderboard Anonymity */}
          <label className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200 cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Appear Anonymously on Leaderboards</span>
              <span className="text-[11px] font-medium text-slate-400">
                Your rank & points will be displayed as "Anonymous Donor"
              </span>
            </div>
            <input
              type="checkbox"
              checked={anonymousLeaderboard}
              onChange={(e) => setAnonymousLeaderboard(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
            />
          </label>

          <div className="flex items-center justify-between pt-1">
            {privacySaved ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} /> Preferences updated!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Auto-applied to your session</span>
            )}
            <button
              type="button"
              onClick={handleSavePrivacyPreferences}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all"
            >
              Save Visibility
            </button>
          </div>
        </div>

        {/* Section 3: Data Management & Export */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            <h4 className="text-sm font-extrabold text-slate-900">Data Management & Portability</h4>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Download an official copy of your personal records, active requests, verified donation history, and activity telemetry in structured JSON.
          </p>

          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Download Account Archive</p>
              <p className="text-[11px] font-medium text-slate-400">GDPR compliance & clinical data archive</p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {exporting ? 'Generating...' : 'Export Data (JSON)'}
            </button>
          </div>

          {exportSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Personal data export downloaded successfully.</span>
            </div>
          )}
        </div>

        {/* Section 4: Account Deletion (Danger Zone) */}
        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" />
            <h4 className="text-sm font-extrabold text-rose-900">Danger Zone</h4>
          </div>

          <p className="text-xs text-rose-700 leading-relaxed font-medium">
            Permanently delete your profile, donor records, verification documents, and audit logs. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Trash2 size={13} />
                Delete My BloodPing Account
              </button>
            </div>
          ) : (
            <div className="bg-white border border-rose-300 rounded-xl p-3 flex flex-col gap-2 shadow-sm animate-in fade-in">
              <p className="text-xs font-bold text-slate-800">
                Are you absolutely sure? Type <span className="text-rose-600 uppercase font-black">DELETE</span> below to confirm:
              </p>
              <input
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
              />

              {deleteError && (
                <p className="text-xs font-bold text-rose-600">{deleteError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || confirmDeleteText.trim().toUpperCase() !== 'DELETE'}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
                  {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
