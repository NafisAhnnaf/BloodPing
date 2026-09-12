import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LogOut, FileText, Users, Search, Filter,
  ArrowUpDown, CheckCircle, XCircle, AlertTriangle, ExternalLink,
  ChevronLeft, ChevronRight, RefreshCw, X, ShieldAlert, UserX, UserCheck,
  Compass, Clock, Mail, Eye
} from 'lucide-react';
import adminService, { DonorApplication, AdminUserItem } from '../../services/adminService';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<{ id: string; email: string } | null>(null);

  // Active Tab: 'applications' | 'users'
  const [activeTab, setActiveTab] = useState<'applications' | 'users'>('applications');

  // --- TAB 1: Donor Applications State ---
  const [applications, setApplications] = useState<DonorApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<string>('pending');
  const [appSort, setAppSort] = useState<string>('newest');
  const [appSearch, setAppSearch] = useState<string>('');

  // Modals for Applications
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // --- TAB 2: User Directory State ---
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  // Modals for Users
  const [banningUser, setBanningUser] = useState<AdminUserItem | null>(null);
  const [banReason, setBanReason] = useState('');
  const [unbanningUser, setUnbanningUser] = useState<AdminUserItem | null>(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch (e) {
        console.warn('Failed to parse admin_user');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  // Fetch Applications
  const loadApplications = async () => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const res = await adminService.getApplications(appStatus, appSort, appSearch);
      setApplications(res.payload || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setAppsError(err.response?.data?.detail || 'Failed to retrieve applications.');
    } finally {
      setAppsLoading(false);
    }
  };

  // Fetch Users
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await adminService.getUsers(userPage, 20, userSearch, userFilter);
      if (res.payload) {
        setUsers(res.payload.users || []);
        setTotalPages(res.payload.total_pages || 1);
        setTotalUsersCount(res.payload.total_count || 0);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setUsersError(err.response?.data?.detail || 'Failed to retrieve user directory.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, appStatus, appSort]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, userPage, userFilter]);

  const handleAppSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
  };

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadUsers();
  };

  const handleReviewApplication = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await adminService.reviewApplication(id, status, reason);
      setRejectingAppId(null);
      setRejectionReason('');
      loadApplications();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to review application.');
    }
  };

  const handleBanUser = async () => {
    if (!banningUser || !banReason.trim()) return;
    try {
      await adminService.banUser(banningUser.id, banReason);
      setBanningUser(null);
      setBanReason('');
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to ban user.');
    }
  };

  const handleUnbanUser = async () => {
    if (!unbanningUser) return;
    try {
      await adminService.unbanUser(unbanningUser.id);
      setUnbanningUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to unban user.');
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toLowerCase()) {
      case 'approved':
        return <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-black uppercase tracking-wider border border-emerald-500/20">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 text-xs font-black uppercase tracking-wider border border-rose-500/20">Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-xs font-black uppercase tracking-wider border border-amber-500/20 animate-pulse">Pending Review</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-none">BloodPing Admin</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-200">
                {adminUser?.email || 'Administrator'}
              </span>
              <span className="text-[10px] uppercase font-black tracking-wider text-red-400">
                Root Access
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'applications'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Donor Applications</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={activeTab === 'applications' ? loadApplications : loadUsers}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${(appsLoading || usersLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ================= TAB 1: DONOR APPLICATIONS ================= */}
        {activeTab === 'applications' && (
          <section className="flex flex-col gap-6">
            {/* Filter Controls Header */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {(['pending', 'approved', 'rejected', 'all'] as const).map((statusKey) => (
                  <button
                    key={statusKey}
                    onClick={() => setAppStatus(statusKey)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all ${
                      appStatus === statusKey
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {statusKey}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* Search Form */}
                <form onSubmit={handleAppSearchSubmit} className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search candidate or blood..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </form>

                {/* Sort Toggle */}
                <button
                  onClick={() => setAppSort(appSort === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="capitalize">{appSort}</span>
                </button>
              </div>
            </div>

            {/* Applications List */}
            {appsLoading ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-16 flex flex-col justify-center items-center">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Loading donor applications...</p>
              </div>
            ) : appsError ? (
              <div className="bg-red-950/20 border border-red-900/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-base font-black text-red-400 mb-1">Failed to Load Applications</h3>
                <p className="text-xs text-red-300 max-w-sm">{appsError}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 flex flex-col justify-center items-center text-center">
                <Clock className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-base font-black text-slate-300 mb-1">No Applications Found</h3>
                <p className="text-xs text-slate-500">There are no donor candidate applications matching criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all flex flex-col gap-4 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-white">{app.full_name}</h3>
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-black">
                            {app.blood_group}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {app.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                        <Compass className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">Travel Radius</p>
                          <p className="text-slate-200 font-bold">{app.travel_radius_km} km</p>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">Submitted On</p>
                          <p className="text-slate-200 font-bold">{new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedDocUrl(app.document_url)}
                        className="bg-slate-950 hover:bg-slate-800 p-3 rounded-2xl border border-slate-800 text-rose-400 flex items-center gap-3 transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="truncate">
                          <p className="text-[10px] font-black uppercase text-rose-500/80">Document</p>
                          <p className="font-bold text-slate-200 flex items-center gap-1 truncate">
                            View Certificate <ExternalLink className="w-3 h-3 text-rose-400" />
                          </p>
                        </div>
                      </button>
                    </div>

                    {app.rejection_reason && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Rejection Reason:</span> {app.rejection_reason}
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    {app.status === 'pending' && (
                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/60">
                        <button
                          onClick={() => {
                            setRejectingAppId(app.id);
                            setRejectionReason('');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 text-rose-400 text-xs font-bold transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve Candidate
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 2: USER DIRECTORY ================= */}
        {activeTab === 'users' && (
          <section className="flex flex-col gap-6">
            {/* Filter Controls Header */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {(['all', 'active', 'banned', 'donors', 'recipients'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => {
                      setUserFilter(filterKey);
                      setUserPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all ${
                      userFilter === filterKey
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* User Search */}
                <form onSubmit={handleUserSearchSubmit} className="relative flex-1 lg:w-72">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, username..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </form>
              </div>
            </div>

            {/* User Directory Table */}
            {usersLoading ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-16 flex flex-col justify-center items-center">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Loading user directory...</p>
              </div>
            ) : usersError ? (
              <div className="bg-red-950/20 border border-red-900/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-base font-black text-red-400 mb-1">Failed to Load Users</h3>
                <p className="text-xs text-red-300 max-w-sm">{usersError}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 flex flex-col justify-center items-center text-center">
                <Users className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-base font-black text-slate-300 mb-1">No Users Found</h3>
                <p className="text-xs text-slate-500">No user accounts matched your search or filter query.</p>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                      <tr>
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Roles</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Joined Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-black text-slate-200 text-sm shrink-0">
                                {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{u.full_name || 'Anonymous'}</p>
                                <p className="text-slate-400 font-medium">{u.email} <span className="text-slate-600">(@{u.username})</span></p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((role) => (
                                <span
                                  key={role}
                                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                    role === 'admin'
                                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                      : role === 'donor'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : role === 'recipient'
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {u.is_banned ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-rose-400 font-black">
                                  <UserX className="w-3.5 h-3.5" /> Banned
                                </span>
                                {u.ban_reason && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-xs" title={u.ban_reason}>
                                    Reason: {u.ban_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-black">
                                <UserCheck className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-400 font-medium">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {u.is_banned ? (
                              <button
                                onClick={() => setUnbanningUser(u)}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/40 text-emerald-400 border border-slate-700 hover:border-emerald-800 font-bold transition-all text-xs"
                              >
                                Unban Account
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setBanningUser(u);
                                  setBanReason('');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 border border-slate-700 hover:border-rose-900 font-bold transition-all text-xs"
                              >
                                Ban Account
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Showing Page <strong className="text-slate-200">{userPage}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalUsersCount} total accounts)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={userPage >= totalPages}
                      onClick={() => setUserPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ================= MODALS ================= */}

      {/* Document View Modal */}
      {selectedDocUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" /> Verification Document Certificate
              </h3>
              <button
                onClick={() => setSelectedDocUrl(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 min-h-[300px] flex flex-col items-center justify-center text-center gap-4">
              {selectedDocUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? (
                <img
                  src={selectedDocUrl}
                  alt="Certificate Verification"
                  className="max-h-[450px] object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-8">
                  <FileText className="w-16 h-16 text-rose-500/60" />
                  <p className="text-xs text-slate-400 max-w-sm">
                    This document is stored as a file attachment or PDF certificate.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={selectedDocUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300"
              >
                Open in new window <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedDocUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" /> Reject Application
              </h3>
              <button
                onClick={() => setRejectingAppId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Please specify the validation issue or reason for rejecting this candidate:
            </p>

            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Laboratory report unreadable, certificate expired..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingAppId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={() => handleReviewApplication(rejectingAppId, 'rejected', rejectionReason)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {banningUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" /> Suspend User Account
              </h3>
              <button
                onClick={() => setBanningUser(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                {banningUser.full_name ? banningUser.full_name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{banningUser.full_name || 'Anonymous'}</p>
                <p className="text-[10px] text-slate-400">{banningUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Provide a clear reason for suspending this user's account and revoking all active sessions:
            </p>

            <textarea
              required
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Violation of donor code of conduct, fraudulent activity..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanningUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={!banReason.trim()}
                onClick={handleBanUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban User Modal */}
      {unbanningUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-500" /> Restore User Account
              </h3>
              <button
                onClick={() => setUnbanningUser(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to lift the suspension for <strong className="text-white">{unbanningUser.full_name || unbanningUser.email}</strong>? They will regain full access to BloodPing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnbanningUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUnbanUser}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
