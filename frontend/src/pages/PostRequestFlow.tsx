import React, { useState, useMemo } from 'react';
import { History as HistoryIcon, Clock, MapPin, CheckCircle, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { RequestCard } from '../components/ui/RequestCard';
import { SelectDropdown } from '../components/ui/SelectDropdown';
import { CreateRequestModal } from '../components/ui/CreateRequestModal';
import { useAppData } from '../context/AppDataContext';
import { useRole } from '../context/RoleContext';

export function PostRequestFlow() {
  const { role } = useRole();
  const { requests, user } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const processedRequests = useMemo(() => {
    let result = [...requests];

    // Filter by role & user involvement
    if (role === 'donor') {
      result = result.filter(req => req.applications.some(app => app.donorId === user?.id));
    } else {
      // Recipient
      result = result.filter(req => req.authorName === user?.name);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(req => req.hospital.toLowerCase().includes(q));
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (sortBy === 'latest') return dateB - dateA;
      return dateA - dateB;
    });

    return result;
  }, [searchQuery, sortBy]);

  const totalPages = Math.ceil(processedRequests.length / itemsPerPage);
  const paginatedRequests = processedRequests.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  return (
    <div className="font-sans">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
          <section>
            <div className="bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start text-center md:text-left justify-between gap-6">
               <div className="relative z-10 flex-1">
                  <h2 className="text-3xl font-extrabold mb-2 tracking-tight flex items-center justify-center md:justify-start gap-2">
                    <HistoryIcon size={28} className="text-white" />
                    {role === 'donor' ? 'Donation History' : 'Request History'}
                  </h2>
                  <p className="text-white/90 text-sm md:text-base font-medium max-w-md mx-auto md:mx-0">
                    {role === 'donor' 
                      ? 'Track your impact and previous blood donations.'
                      : 'View your past blood requests and their fulfillment status.'}
                  </p>
               </div>
            </div>
          </section>

          {/* Recipient Create Request Button */}
          {role === 'recipient' && (
            <div className="mb-2">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all border border-slate-700"
              >
                + Create Blood Request
              </button>
            </div>
          )}

          {/* Search Row */}
          <section className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by hospital..."
                className="w-full bg-white/60 backdrop-blur-md border border-white/60 text-slate-900 rounded-2xl py-3 pl-11 pr-4 font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
              />
            </div>
            <div className="w-48">
              <SelectDropdown 
                value={sortBy} 
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { label: 'Latest', value: 'latest' },
                  { label: 'Oldest', value: 'oldest' }
                ]}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            {paginatedRequests.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm">
                  <AlertCircle size={32} className="text-slate-400 mb-3" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No history found</h3>
               </div>
            ) : (
              paginatedRequests.map((req) => (
                <RequestCard key={req.id} request={req} />
              ))
            )}
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm mt-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white/60 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white/60 transition-colors shadow-sm font-bold flex items-center"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-extrabold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white/60 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white/60 transition-colors shadow-sm font-bold flex items-center"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
      </main>

      {showCreateModal && <CreateRequestModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
