import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, LogOut, FileText, Users, Search, Filter,
  ArrowUpDown, CheckCircle, XCircle, AlertTriangle, ExternalLink,
  ChevronLeft, ChevronRight, RefreshCw, X, ShieldAlert, UserX, UserCheck,
  Compass, Clock, Mail, Droplet, ArrowLeft, UserMinus
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

  // Role Removal Modal State
  const [removingRoleData, setRemovingRoleData] = useState<{ user: AdminUserItem; role: 'donor' | 'recipient' } | null>(null);
  const [roleRemovalReason, setRoleRemovalReason] = useState('');
  const [roleRemoving, setRoleRemoving] = useState(false);

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

  const handleConfirmRoleRemoval = async () => {
    if (!removingRoleData) return;
    setRoleRemoving(true);
    try {
      if (removingRoleData.role === 'donor') {
        await adminService.removeDonorRole(removingRoleData.user.id, roleRemovalReason);
      } else {
        await adminService.removeRecipientRole(removingRoleData.user.id, roleRemovalReason);
      }
      setRemovingRoleData(null);
      setRoleRemovalReason('');
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to remove ${removingRoleData.role} role.`);
    } finally {
      setRoleRemoving(false);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toLowerCase()) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-200">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-wider border border-amber-200 animate-pulse">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-red-200 text-slate-900 font-sans antialiased pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/40 backdrop-blur-lg border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/feed" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Droplet size={26} className="text-red-600 fill-red-600" />
              <h1 className="font-black text-xl text-slate-900 tracking-tight">BloodPing</h1>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-600 border border-red-200">
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-800">
                {adminUser?.email || 'Administrator'}
              </span>
              <span className="text-[10px] uppercase font-black tracking-wider text-red-600">
                Root Access
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-red-600 text-xs font-bold transition-all border border-white/80 shadow-sm"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 flex flex-col gap-6">
        {/* Hero Section */}
        <section>
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative z-10 flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center justify-center md:justify-start gap-2.5">
                <ShieldCheck size={32} className="text-white shrink-0" />
                Administration Center
              </h2>
              <p className="text-white/90 text-xs md:text-sm font-semibold max-w-xl mt-1.5 leading-relaxed">
                Validate submitted laboratory reports, issue donor credentials, and manage platform safety with live audit tracking.
              </p>
            </div>

            <div className="relative z-10 bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center flex-shrink-0 w-full md:w-auto shadow-sm">
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-0.5">
                {activeTab === 'applications' ? 'Pending Applications' : 'Total Directory Users'}
              </p>
              <p className="text-3xl font-black">
                {activeTab === 'applications'
                  ? applications.filter(a => a.status === 'pending').length
                  : totalUsersCount
                }
              </p>
            </div>

            {/* Decorative blurs */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-orange-400/30 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 gap-2 w-full sm:w-auto shadow-sm">
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'applications'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Donor Applications</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={activeTab === 'applications' ? loadApplications : loadUsers}
              className="p-2.5 rounded-xl bg-white/70 hover:bg-white text-slate-700 border border-white/80 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${(appsLoading || usersLoading) ? 'animate-spin text-red-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: DONOR APPLICATIONS ================= */}
        {activeTab === 'applications' && (
          <section className="flex flex-col gap-6">
            {/* Filter Controls Header */}
            <div className="bg-white/80 border border-white/60 rounded-3xl p-5 backdrop-blur-xl shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-red-500" /> Status:
                </span>
                {(['pending', 'approved', 'rejected', 'all'] as const).map((statusKey) => (
                  <button
                    key={statusKey}
                    onClick={() => setAppStatus(statusKey)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all ${
                      appStatus === statusKey
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80 shadow-sm'
                    }`}
                  >
                    {statusKey}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* Search Form */}
                <form onSubmit={handleAppSearchSubmit} className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate or blood..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full bg-white/90 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm"
                  />
                </form>

                {/* Sort Toggle */}
                <button
                  onClick={() => setAppSort(appSort === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-all shadow-sm shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="capitalize">{appSort}</span>
                </button>
              </div>
            </div>

            {/* Applications List */}
            {appsLoading ? (
              <div className="bg-white/70 border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center shadow-lg backdrop-blur-xl">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">
                  Loading donor applications...
                </p>
              </div>
            ) : appsError ? (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-base font-black text-red-700 mb-1">Failed to Load Applications</h3>
                <p className="text-xs text-red-600 max-w-sm">{appsError}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white/70 border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center text-center shadow-md backdrop-blur-xl">
                <Clock className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="text-base font-black text-slate-800 mb-1">No Applications Found</h3>
                <p className="text-xs text-slate-500 font-medium">There are no donor candidate applications matching criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white/85 border border-white/60 rounded-3xl p-6 hover:shadow-xl transition-all flex flex-col gap-4 shadow-lg backdrop-blur-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-slate-900">{app.full_name}</h3>
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-100 border border-red-200 text-red-600 text-xs font-black">
                            {app.blood_group}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {app.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-inner">
                        <Compass className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Travel Radius</p>
                          <p className="text-slate-800 font-black">{app.travel_radius_km} km</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-inner">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Submitted On</p>
                          <p className="text-slate-800 font-black">{new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedDocUrl(app.document_url)}
                        className="bg-white hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-red-600 flex items-center gap-3 transition-colors text-left shadow-sm"
                      >
                        <FileText className="w-4 h-4 shrink-0 text-red-500" />
                        <div className="truncate">
                          <p className="text-[10px] font-black uppercase text-red-500">Medical Record</p>
                          <p className="font-extrabold text-slate-800 flex items-center gap-1 truncate">
                            View Certificate <ExternalLink className="w-3 h-3 text-slate-400" />
                          </p>
                        </div>
                      </button>
                    </div>

                    {app.rejection_reason && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Rejection Reason:</span> {app.rejection_reason}
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    {app.status === 'pending' && (
                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setRejectingAppId(app.id);
                            setRejectionReason('');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black transition-all shadow-sm active:scale-98"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-98"
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
            <div className="bg-white/80 border border-white/60 rounded-3xl p-5 backdrop-blur-xl shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-red-500" /> Filter:
                </span>
                {(['all', 'active', 'banned', 'donors', 'recipients'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => {
                      setUserFilter(filterKey);
                      setUserPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all ${
                      userFilter === filterKey
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80 shadow-sm'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* User Search */}
                <form onSubmit={handleUserSearchSubmit} className="relative flex-1 lg:w-72">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, username..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-white/90 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm"
                  />
                </form>
              </div>
            </div>

            {/* User Directory Table */}
            {usersLoading ? (
              <div className="bg-white/70 border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center shadow-lg backdrop-blur-xl">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">Loading user directory...</p>
              </div>
            ) : usersError ? (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-base font-black text-red-700 mb-1">Failed to Load Users</h3>
                <p className="text-xs text-red-600 max-w-sm">{usersError}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white/70 border border-white/60 rounded-3xl p-16 flex flex-col justify-center items-center text-center shadow-md backdrop-blur-xl">
                <Users className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="text-base font-black text-slate-800 mb-1">No Users Found</h3>
                <p className="text-xs text-slate-500 font-medium">No user accounts matched your search or filter query.</p>
              </div>
            ) : (
              <div className="bg-white/85 border border-white/60 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider">
                      <tr>
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Roles</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Joined Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
                                {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{u.full_name || 'Anonymous'}</p>
                                <p className="text-slate-500 font-medium">{u.email} <span className="text-slate-400">(@{u.username})</span></p>
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
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : role === 'donor'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : role === 'recipient'
                                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
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
                                <span className="inline-flex items-center gap-1 text-rose-600 font-black">
                                  <UserX className="w-3.5 h-3.5" /> Banned
                                </span>
                                {u.ban_reason && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-xs" title={u.ban_reason}>
                                    Reason: {u.ban_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                                <UserCheck className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {/* Remove as Donor button */}
                              {!u.is_banned && (userFilter === 'donors' || (userFilter !== 'recipients' && u.roles.includes('donor'))) && (
                                <button
                                  onClick={() => {
                                    setRemovingRoleData({ user: u, role: 'donor' });
                                    setRoleRemovalReason('');
                                  }}
                                  title="Revoke donor privileges"
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-black transition-all text-xs shadow-sm active:scale-98 flex items-center gap-1.5"
                                >
                                  <UserMinus className="w-3.5 h-3.5 text-amber-600" />
                                  Remove as Donor
                                </button>
                              )}

                              {/* Remove as Recipient button */}
                              {!u.is_banned && (userFilter === 'recipients' || (userFilter !== 'donors' && u.roles.includes('recipient'))) && (
                                <button
                                  onClick={() => {
                                    setRemovingRoleData({ user: u, role: 'recipient' });
                                    setRoleRemovalReason('');
                                  }}
                                  title="Revoke recipient privileges"
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-black transition-all text-xs shadow-sm active:scale-98 flex items-center gap-1.5"
                                >
                                  <UserMinus className="w-3.5 h-3.5 text-amber-600" />
                                  Remove as Recipient
                                </button>
                              )}

                              {/* Ban / Unban Account */}
                              {u.is_banned ? (
                                <button
                                  onClick={() => setUnbanningUser(u)}
                                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 font-black transition-all text-xs shadow-sm active:scale-98"
                                >
                                  Unban Account
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setBanningUser(u);
                                    setBanReason('');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black transition-all text-xs shadow-sm active:scale-98"
                                >
                                  Ban Account
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="bg-slate-50/90 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold">
                    Showing Page <strong className="text-slate-800">{userPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({totalUsersCount} total accounts)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={userPage >= totalPages}
                      onClick={() => setUserPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 border border-white/80 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" /> Verification Document Certificate
              </h3>
              <button
                onClick={() => setSelectedDocUrl(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-[300px] flex flex-col items-center justify-center text-center gap-4">
              {selectedDocUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? (
                <img
                  src={selectedDocUrl}
                  alt="Certificate Verification"
                  className="max-h-[450px] object-contain rounded-xl shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-8">
                  <FileText className="w-16 h-16 text-red-500/60" />
                  <p className="text-xs font-bold text-slate-600 max-w-sm">
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
                className="flex items-center gap-2 text-xs font-black text-red-600 hover:text-red-700"
              >
                Open in new window <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedDocUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" /> Reject Application
              </h3>
              <button
                onClick={() => setRejectingAppId(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500">
              Please specify the validation issue or reason for rejecting this candidate:
            </p>

            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Laboratory report unreadable, certificate expired..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-all"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingAppId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={() => handleReviewApplication(rejectingAppId, 'rejected', rejectionReason)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-98 transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {banningUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" /> Suspend User Account
              </h3>
              <button
                onClick={() => setBanningUser(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                {banningUser.full_name ? banningUser.full_name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{banningUser.full_name || 'Anonymous'}</p>
                <p className="text-[10px] font-semibold text-slate-400">{banningUser.email}</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500">
              Provide a clear reason for suspending this user's account and revoking all active sessions:
            </p>

            <textarea
              required
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Violation of donor code of conduct, fraudulent activity..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-all"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanningUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!banReason.trim()}
                onClick={handleBanUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-98 transition-all"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban User Modal */}
      {unbanningUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" /> Restore User Account
              </h3>
              <button
                onClick={() => setUnbanningUser(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to lift the suspension for <strong className="text-slate-900">{unbanningUser.full_name || unbanningUser.email}</strong>? They will regain full access to BloodPing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnbanningUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnbanUser}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Removal Modal */}
      {removingRoleData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-amber-600" />
                Remove {removingRoleData.role === 'donor' ? 'Donor' : 'Recipient'} Privileges
              </h3>
              <button
                onClick={() => setRemovingRoleData(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                {removingRoleData.user.full_name ? removingRoleData.user.full_name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{removingRoleData.user.full_name || 'Anonymous'}</p>
                <p className="text-[10px] font-semibold text-slate-400">{removingRoleData.user.email} (@{removingRoleData.user.username})</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {removingRoleData.role === 'donor'
                ? 'This will deactivate their donor profile, remove them from donor matching, and revoke donor capabilities. Their account and past donation history will remain intact.'
                : 'This will freeze their recipient privileges and prevent them from creating new blood requests. Their account and past requests will remain intact.'}
            </p>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Reason for Revocation (Sent via notification)
              </label>
              <textarea
                rows={3}
                value={roleRemovalReason}
                onChange={(e) => setRoleRemovalReason(e.target.value)}
                placeholder={
                  removingRoleData.role === 'donor'
                    ? 'e.g. Ineligible medical report, failed verification, repeated cancellation...'
                    : 'e.g. Fraudulent blood request, policy violation...'
                }
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemovingRoleData(null)}
                disabled={roleRemoving}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={roleRemoving}
                onClick={handleConfirmRoleRemoval}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-1.5"
              >
                {roleRemoving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserMinus className="w-3.5 h-3.5" />
                )}
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
