import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { 
  Users, Check, X, ShieldAlert, Award, FileText, 
  Clock, MapPin, Compass, AlertCircle, RefreshCw 
} from 'lucide-react';
import apiClient from '../services/apiClient';

export function AdminDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetchApplications = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/admins/applications');
      setApplications(res.data);
    } catch (err: any) {
      console.error('Error fetching admin applications:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to retrieve applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReview = async (appId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }

    try {
      await apiClient.post(`/admins/applications/${appId}/review`, {
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null
      });
      setRejectionReason('');
      setReviewingId(null);
      await fetchApplications();
    } catch (err: any) {
      console.error('Error submitting application review:', err);
      alert(err.response?.data?.detail || 'Failed to submit review.');
    }
  };

  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 text-xs font-bold uppercase tracking-wider backdrop-blur-md">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-700 text-xs font-bold uppercase tracking-wider backdrop-blur-md">Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-700 text-xs font-bold uppercase tracking-wider backdrop-blur-md animate-pulse">Pending Review</span>;
    }
  };

  return (
    <div className="font-sans">
      <Header />

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Admin Title Card */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex items-center justify-between">
          <div className="z-10">
            <h2 className="text-3xl font-black mb-1.5 tracking-tight flex items-center gap-2">
              <Award className="text-red-500 fill-red-500" /> Admin Console
            </h2>
            <p className="text-slate-300 text-sm font-semibold">
              Review donor candidates and authenticate blood certifications.
            </p>
          </div>
          <button 
            onClick={fetchApplications}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 text-white"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </section>

        {/* Dashboard Tabs & Metrics */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-white/50 backdrop-blur-md border border-white/60 p-1.5 rounded-2xl shadow-sm gap-1 w-full sm:w-auto">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  filter === tab 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Total Applications: {filteredApps.length}
          </div>
        </section>

        {/* Applications Grid */}
        <section className="flex flex-col gap-4">
          {loading ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">Fetching verification ledger...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-red-50 border border-red-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
              <ShieldAlert size={48} className="text-red-500 mb-3" />
              <h3 className="text-lg font-black text-red-800 mb-1">Access Restricted</h3>
              <p className="text-sm font-semibold text-red-600 max-w-xs leading-relaxed">{errorMsg}</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center text-center text-slate-500">
              <Clock size={48} className="text-slate-400 mb-3" />
              <h3 className="text-lg font-black text-slate-800 mb-1">No Applications Found</h3>
              <p className="text-xs font-bold max-w-xs">There are no donor candidate applications matching the selected filter.</p>
            </div>
          ) : (
            filteredApps.map(app => (
              <div 
                key={app.id} 
                className="bg-white/95 backdrop-blur-md border border-white/80 shadow-md hover:shadow-lg rounded-3xl p-6 transition-all flex flex-col gap-4"
              >
                {/* Header Information */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 mb-0.5">{app.full_name}</h3>
                    <p className="text-xs font-bold text-slate-400">{app.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(app.status)}
                    <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider">
                      Blood: {app.blood_group}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <Compass size={16} className="text-red-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Radius Reach</p>
                      <p className="text-slate-800">{app.travel_radius_km} km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <Clock size={16} className="text-orange-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Submitted On</p>
                      <p className="text-slate-800">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <a 
                    href={app.document_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-red-50/50 hover:bg-red-50 p-3 rounded-2xl border border-red-100 text-red-600 transition-colors"
                  >
                    <FileText size={16} />
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black">Verification Document</p>
                      <p className="font-extrabold flex items-center gap-1">View Certificate ↗</p>
                    </div>
                  </a>
                </div>

                {/* Actions Panel */}
                {app.status === 'pending' && (
                  <div className="pt-2 flex flex-col gap-3">
                    {reviewingId === app.id ? (
                      <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 animate-in slide-in-from-top-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-red-500" /> Reason for Rejection
                        </label>
                        <textarea
                          placeholder="Please provide comments detailing the validation issue (e.g. certificate unreadable, expired report)..."
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          className="w-full text-sm font-semibold p-3 border border-slate-300 rounded-xl focus:border-red-500 focus:outline-none bg-white min-h-20 text-slate-800"
                        />
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={() => {
                              setReviewingId(null);
                              setRejectionReason('');
                            }}
                            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                          >
                            Back
                          </button>
                          <button
                            onClick={() => handleReview(app.id, 'rejected')}
                            className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/10 transition-all"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setReviewingId(app.id)}
                          className="flex items-center gap-1 px-4 py-2.5 text-xs font-bold border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50/40 rounded-xl transition-all"
                        >
                          <X size={14} /> Reject Application
                        </button>
                        <button
                          onClick={() => handleReview(app.id, 'approved')}
                          className="flex items-center gap-1 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/10 transition-all"
                        >
                          <Check size={14} /> Approve Candidate
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
