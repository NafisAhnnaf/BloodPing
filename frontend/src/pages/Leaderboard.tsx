import React, { useState, useMemo } from 'react';
import { Trophy, ChevronUp, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAppData } from '../context/AppDataContext';

export function Leaderboard() {
  const { donors } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const processedDonors = useMemo(() => {
    let result = [...donors];
    
    // Sort by top units by default
    result.sort((a, b) => b.units - a.units);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q));
    }

    return result;
  }, [searchQuery]);

  const totalPages = Math.ceil(processedDonors.length / itemsPerPage);
  const paginatedDonors = processedDonors.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="font-sans">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        <section>
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col items-center text-center">
            <Trophy size={48} className="mb-2 opacity-90" />
            <h2 className="text-3xl font-extrabold mb-1 tracking-tight">Top Donors</h2>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-md">
              Honoring our community heroes who are making the biggest impact in saving lives.
            </p>
          </div>
        </section>

        {/* Search Row */}
        <section>
          <div className="relative">
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
        </section>

        <section className="flex flex-col gap-3">
          {paginatedDonors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm">
               <AlertCircle size={32} className="text-slate-400 mb-3" />
               <h3 className="text-lg font-bold text-slate-800 mb-1">No heroes found</h3>
            </div>
          ) : (
            paginatedDonors.map((donor, index) => {
              // Calculate actual rank across all pages
              const rank = ((currentPage - 1) * itemsPerPage) + index + 1;
              return (
                <div key={donor.id} className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl p-4 flex items-center justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:bg-white/50 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      rank === 1 ? 'bg-amber-100 text-amber-700' :
                      rank === 2 ? 'bg-slate-200 text-slate-600' :
                      rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-white text-slate-400 border border-slate-100'
                    }`}>
                      #{rank}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{donor.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">Blood Group: {donor.bloodType}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-black text-xl text-orange-600 flex items-center gap-1">
                      {donor.units}
                      <ChevronUp size={16} />
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Points</span>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
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
