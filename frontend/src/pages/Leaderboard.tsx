import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, ChevronUp, Search, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Flame, Filter } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { LeaderboardService, LeaderboardEntry } from '../services/leaderboardService';

const BLOOD_GROUPS = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function Leaderboard() {
  const [donors, setDonors] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const bloodGroupParam = selectedBloodGroup === 'ALL' ? undefined : selectedBloodGroup;
      const data = await LeaderboardService.getLeaderboard(50, bloodGroupParam);
      setDonors(data || []);
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedBloodGroup]);

  // Client-side search filtering
  const processedDonors = useMemo(() => {
    let result = [...donors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        (d.full_name && d.full_name.toLowerCase().includes(q)) ||
        (d.username && d.username.toLowerCase().includes(q))
      );
    }

    return result;
  }, [donors, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(processedDonors.length / itemsPerPage));
  const paginatedDonors = useMemo(() => {
    return processedDonors.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [processedDonors, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBloodGroup]);

  return (
    <div className="font-sans min-h-screen bg-slate-50/50">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Banner Section */}
        <section>
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col items-center text-center">
            <Trophy size={48} className="mb-2 opacity-90" />
            <h2 className="text-3xl font-extrabold mb-1 tracking-tight">Top Donors</h2>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-md">
              Honoring our community heroes who are making the biggest impact in saving lives.
            </p>
          </div>
        </section>

        {/* Search & Filter Row */}
        <section className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search heroes by name..."
              className="w-full bg-white/60 backdrop-blur-md border border-white/60 text-slate-900 rounded-2xl py-3 pl-11 pr-4 font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm"
            />
          </div>

          {/* Blood Group Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={16} className="text-slate-400" />
            </div>
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="bg-white/60 backdrop-blur-md border border-white/60 text-slate-900 rounded-2xl py-3 pl-9 pr-8 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm appearance-none cursor-pointer"
            >
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group === 'ALL' ? 'All Blood Types' : group}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Content Section */}
        <section className="flex flex-col gap-3">
          {loading ? (
            /* Loading Skeleton */
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200/60"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-200/80 rounded"></div>
                      <div className="h-3 w-20 bg-slate-200/50 rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-slate-200/70 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-12 text-center bg-rose-500/10 backdrop-blur-md rounded-3xl border border-rose-500/20 shadow-sm p-6">
              <AlertCircle size={40} className="text-rose-500 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Failed to load leaderboard</h3>
              <p className="text-sm text-slate-600 mb-4 max-w-sm">{error}</p>
              <button
                onClick={fetchLeaderboardData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-md transition-all text-sm"
              >
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : paginatedDonors.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm">
              <AlertCircle size={32} className="text-slate-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">No heroes found</h3>
              <p className="text-sm text-slate-500 font-medium">
                {searchQuery ? `No donors match "${searchQuery}"` : 'No donors on the leaderboard yet.'}
              </p>
            </div>
          ) : (
            /* Donor Cards List */
            paginatedDonors.map((donor) => {
              const rank = donor.rank_overall;
              const points = donor.total_points ?? 0;
              const badge = donor.badge || '🌱 NEW';

              return (
                <div 
                  key={donor.donor_id} 
                  className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl p-4 flex items-center justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:bg-white/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-base shadow-sm ${
                      rank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      rank === 2 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                      rank === 3 ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                      'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      #{rank}
                    </div>

                    {/* Donor Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{donor.full_name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/60 text-slate-700">
                          {badge}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                        <span>Group: <strong className="text-slate-700">{donor.blood_group}</strong></span>
                        <span>•</span>
                        <span>{donor.total_donations} {donor.total_donations === 1 ? 'donation' : 'donations'}</span>
                        {donor.current_streak > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-orange-600 font-bold">
                              <Flame size={13} /> {donor.current_streak} streak
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Points Counter */}
                  <div className="flex flex-col items-end">
                    <span className="font-black text-xl text-orange-600 flex items-center gap-1">
                      {points.toLocaleString()}
                      <ChevronUp size={16} />
                    </span>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400">Points</span>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm mt-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-white/60 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white/60 transition-colors shadow-sm font-bold"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-extrabold text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-white/60 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white/60 transition-colors shadow-sm font-bold"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
