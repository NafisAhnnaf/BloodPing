import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, Search, AlertCircle, Heart, Filter, ChevronLeft, ChevronRight, X, Activity, Crosshair, Loader2, Navigation
} from 'lucide-react';

import { RangeSlider } from '../components/ui/RangeSlider';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SelectDropdown } from '../components/ui/SelectDropdown';
import { RequestCard } from '../components/ui/RequestCard';
import { CreateRequestModal } from '../components/ui/CreateRequestModal';
import { BLOOD_GROUPS } from '../services/mockData';
import { useRole } from '../context/RoleContext';
import { useAppData } from '../context/AppDataContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { Header } from '../components/layout/Header';

export function FeedPage() {
  const [activeGroup, setActiveGroup] = useState('All');
  const { role, donorDetails, refreshDonorDetails } = useRole();
  const { requests, fetchRequests } = useAppData();
  const { requestLocation, loading: geoLoading } = useGeolocation();

  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(25); // default 25km per specification
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'open'>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'urgent' | 'latest' | 'oldest' | 'abc' | 'deadline'>('nearest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleEnableLiveGPS = async () => {
    const pos = await requestLocation();
    if (pos) {
      setLiveCoords({ lat: pos.latitude, lng: pos.longitude });
      await fetchRequests({ lat: pos.latitude, lng: pos.longitude, radius_km: maxDistance });
    }
  };

  useEffect(() => {
    fetchRequests({
      lat: liveCoords?.lat,
      lng: liveCoords?.lng,
      radius_km: maxDistance,
    });
  }, [maxDistance]);

  const { processedRequests, isProximityFallback } = useMemo(() => {
    let result = [...requests];

    if (role === 'recipient') {
      result = result.filter(req => req.isOwner);
    }

    // Filter by Blood Group
    if (activeGroup !== 'All') {
      result = result.filter(req => req.bloodGroup === activeGroup);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(req => req.hospital.toLowerCase().includes(q));
    }

    // Filter by Urgency
    if (urgencyFilter === 'urgent') result = result.filter(req => req.urgent);
    if (urgencyFilter === 'open') result = result.filter(req => !req.urgent);

    // Filter by Distance
    let listToDisplay;
    let isFallback = false;
    
    if (role === 'recipient') {
      // Recipients see all their requests regardless of distance
      listToDisplay = result;
    } else {
      const withinDistance = result.filter(req => req.distance <= maxDistance);
      isFallback = withinDistance.length === 0 && result.length > 0;
      listToDisplay = isFallback ? [...result] : withinDistance;
    }

    // Sorting
    listToDisplay.sort((a, b) => {
      if (role === 'recipient') {
        const aOpen = a.status === 'open' ? 0 : 1;
        const bOpen = b.status === 'open' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      // In proximity fallback mode when sortBy is default 'nearest', rank by latest deadline first
      if (isFallback && sortBy === 'nearest') {
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : 0;
        if (deadlineB !== deadlineA) return deadlineB - deadlineA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortBy === 'deadline') {
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : 0;
        if (deadlineB !== deadlineA) return deadlineB - deadlineA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'nearest') {
        // Tier 1: Urgent requests within 25 km come first
        const aUrgentClose = a.urgent && a.distance <= 25 ? 0 : 1;
        const bUrgentClose = b.urgent && b.distance <= 25 ? 0 : 1;
        if (aUrgentClose !== bUrgentClose) return aUrgentClose - bUrgentClose;
        if (a.distance !== b.distance) return a.distance - b.distance;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'urgent') {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return a.distance - b.distance;
      }
      if (sortBy === 'abc') return a.hospital.localeCompare(b.hospital);
      
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (sortBy === 'latest') return dateB - dateA;
      return dateA - dateB;
    });

    return { processedRequests: listToDisplay, isProximityFallback: isFallback };
  }, [requests, activeGroup, searchQuery, maxDistance, urgencyFilter, sortBy, role]);

  // Pagination Logic
  const totalPages = Math.ceil(processedRequests.length / itemsPerPage);
  const paginatedRequests = processedRequests.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeGroup, searchQuery, maxDistance, urgencyFilter, sortBy]);

  useEffect(() => {
    if (role === 'donor') {
      refreshDonorDetails();
    }
  }, [role]);

  const restPeriodInfo = useMemo(() => {
    if (!donorDetails?.rest_period_until) {
      return { inRestPeriod: false, daysRemaining: 0, dateFormatted: null };
    }
    const untilDate = new Date(donorDetails.rest_period_until);
    const now = new Date();
    const diffMs = untilDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return { inRestPeriod: false, daysRemaining: 0, dateFormatted: null };
    }

    return {
      inRestPeriod: true,
      daysRemaining: days,
      dateFormatted: untilDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: untilDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    };
  }, [donorDetails?.rest_period_until]);

  const totalDonations = donorDetails?.total_donations ?? 0;

  const myRequests = useMemo(() => requests.filter(r => r.isOwner), [requests]);
  const myActiveRequests = useMemo(() => myRequests.filter(r => r.status === 'open'), [myRequests]);
  const myFulfilledUnits = useMemo(() => myRequests.reduce((acc, r) => acc + (r.unitsFulfilled || 0), 0), [myRequests]);
  const myRequiredUnits = useMemo(() => myRequests.reduce((acc, r) => acc + (r.unitsRequired || 0), 0), [myRequests]);
  const fulfillmentPercent = myRequiredUnits > 0 ? Math.round((myFulfilledUnits / myRequiredUnits) * 100) : 0;

  return (
    <div className="font-sans relative">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
          {/* Hero Section */}
          <section>
            <div className="bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start text-center md:text-left justify-between gap-6">
               <div className="relative z-10 flex-1">
                  {role === 'donor' ? (
                    <>
                      <h2 className="text-3xl font-extrabold mb-2 tracking-tight flex items-center justify-center md:justify-start gap-2">
                        <Heart size={28} className="fill-white" />
                        Every drop counts.
                      </h2>
                      <p className="text-white/90 text-sm md:text-base font-medium max-w-md mx-auto md:mx-0 leading-relaxed">
                        {restPeriodInfo.inRestPeriod
                          ? (totalDonations > 0
                              ? `You have donated ${totalDonations} time${totalDonations === 1 ? '' : 's'}. Your next eligible donation date is in ${restPeriodInfo.daysRemaining} day${restPeriodInfo.daysRemaining === 1 ? '' : 's'}${restPeriodInfo.dateFormatted ? ` (${restPeriodInfo.dateFormatted})` : ''}.`
                              : `Your next eligible donation date is in ${restPeriodInfo.daysRemaining} day${restPeriodInfo.daysRemaining === 1 ? '' : 's'}${restPeriodInfo.dateFormatted ? ` (${restPeriodInfo.dateFormatted})` : ''}.`
                            )
                          : (totalDonations > 0
                              ? `You have donated ${totalDonations} time${totalDonations === 1 ? '' : 's'}. You are eligible and ready to save lives today!`
                              : "Every drop counts. You are currently eligible and ready to respond to blood requests."
                            )
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-extrabold mb-2 tracking-tight flex items-center justify-center md:justify-start gap-2">
                        <Activity size={28} className="text-white" />
                        Your Requests.
                      </h2>
                      <p className="text-white/90 text-sm md:text-base font-medium max-w-md mx-auto md:mx-0 leading-relaxed">
                        {myRequests.length === 0 
                          ? "You have no blood requests yet. Click '+ Create Blood Request' below whenever blood is needed."
                          : `You have created ${myRequests.length} blood request(s) (${myActiveRequests.length} active). Manage them and track donor applications below.`
                        }
                      </p>
                    </>
                  )}
               </div>
               
               <div className="relative z-10 bg-white/20 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20 text-center flex-shrink-0 w-full md:w-auto shadow-sm">
                  {role === 'donor' ? (
                    <>
                      <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Rest Period</p>
                      {restPeriodInfo.inRestPeriod ? (
                        <p className="text-4xl font-black">
                          {restPeriodInfo.daysRemaining}{' '}
                          <span className="text-xl font-bold opacity-80">
                            {restPeriodInfo.daysRemaining === 1 ? 'day' : 'days'}
                          </span>
                        </p>
                      ) : (
                        <div className="mt-1 flex justify-center">
                          <span className="inline-block text-sm font-bold text-emerald-900 bg-emerald-400 px-4 py-2 rounded-xl shadow-md border border-emerald-300">
                            You are now eligible
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                        {myRequests.length > 0 ? 'Fulfilled' : 'My Requests'}
                      </p>
                      <p className="text-4xl font-black">
                        {myRequests.length > 0 ? `${fulfillmentPercent}` : '0'} 
                        <span className="text-xl font-bold opacity-80">{myRequests.length > 0 ? '%' : ''}</span>
                      </p>
                    </>
                  )}
               </div>
               
               {/* Decorative background elements */}
               <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
               <div className="absolute left-0 bottom-0 w-32 h-32 bg-orange-400/30 rounded-full blur-2xl pointer-events-none"></div>
            </div>
          </section>

          {/* Search and Filters Section */}
          <section className="space-y-4">
             {/* Search Bar Row */}
             <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search hospitals..."
                    className="w-full bg-white/60 backdrop-blur-md border border-white/60 text-slate-900 rounded-2xl py-3 pl-11 pr-4 font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm ${showFilters ? 'bg-red-600 text-white border-transparent' : 'bg-white/60 backdrop-blur-md text-slate-700 border border-white/60 hover:bg-white'}`}
                >
                  <Filter size={18} />
                  <span className="hidden md:inline">Filters</span>
                </button>
             </div>

             {/* Expandable Filter Panel */}
             {showFilters && (
               <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-lg space-y-6 animate-in slide-in-from-top-2">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">Advanced Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-700 bg-white/50 hover:bg-white rounded-full p-1.5 transition-colors">
                      <X size={20} />
                    </button>
                 </div>
                 
                 <div className="flex flex-col space-y-6">
                   {/* Distance Slider */}
                   <div>
                     <RangeSlider 
                       label="Distance"
                       value={maxDistance}
                       min={1}
                       max={50}
                       unit="km"
                       marks={[10, 20, 30, 40]}
                       onChange={setMaxDistance}
                     />
                   </div>

                   <div className="h-px w-full bg-orange-100/60" />

                   {/* Urgency Filter */}
                   <div>
                     <SegmentedControl 
                       label="Urgency"
                       value={urgencyFilter}
                       onChange={(val) => setUrgencyFilter(val as any)}
                       options={[
                         { label: 'All', value: 'all' },
                         { label: 'Urgent', value: 'urgent' },
                         { label: 'Open', value: 'open' }
                       ]}
                     />
                   </div>

                   <div className="h-px w-full bg-orange-100/60" />

                   {/* Sort Options */}
                   <div>
                     <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase text-left mb-3">Sort By</label>
                     <SelectDropdown
                       value={sortBy}
                       onChange={(val) => setSortBy(val as any)}
                       options={[
                         { label: 'Nearest First (Proximity)', value: 'nearest' },
                         { label: 'Latest Deadline First', value: 'deadline' },
                         { label: 'Most Urgent First', value: 'urgent' },
                         { label: 'Latest First', value: 'latest' },
                         { label: 'Oldest First', value: 'oldest' },
                         { label: 'Alphabetical (A-Z)', value: 'abc' }
                       ]}
                     />
                   </div>
                 </div>
               </div>
             )}

             {/* Recipient Create Request Button */}
             {role === 'recipient' && (
               <div className="mt-6 mb-2">
                 <button 
                   onClick={() => setShowCreateModal(true)}
                   className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all border border-slate-700"
                 >
                   + Create Blood Request
                 </button>
               </div>
             )}

             {/* Blood Group Pills */}
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
               {BLOOD_GROUPS.map(bg => (
                 <button 
                    key={bg}
                    onClick={() => setActiveGroup(bg)}
                     className={`snap-start px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border shadow-sm
                      ${activeGroup === bg ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white/60 backdrop-blur-md text-slate-700 border-white/60 hover:bg-white'}`}
                 >
                   {bg}
                 </button>
               ))}
             </div>
          </section>

          {/* Geolocation Proximity Feed Banner */}
          <div className="flex items-center justify-between bg-white/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/60 text-xs font-bold text-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <Navigation size={15} className="text-red-600" />
              <span>
                {liveCoords
                  ? `Live GPS Active (Within ${maxDistance} km)`
                  : `Ranked by Proximity to Your Location (Within ${maxDistance} km)`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleEnableLiveGPS}
              disabled={geoLoading}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-extrabold text-[11px] bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-red-200 transition-all active:scale-95 shadow-xs disabled:opacity-50"
            >
              {geoLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <Crosshair size={12} />
                  {liveCoords ? 'Refresh GPS' : 'Use Live GPS'}
                </>
              )}
            </button>
          </div>

          {/* Proximity Fallback Notice */}
          {isProximityFallback && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-2xl text-amber-900 shadow-sm animate-in fade-in">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">
                No blood requests found within <span className="font-bold">{maxDistance} km</span>. Showing all active requests ordered by <span className="font-bold">latest deadline first</span>.
              </p>
            </div>
          )}

          {/* Vertical Feed Content */}
          <section className="flex flex-col gap-4">
            {paginatedRequests.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm">
                  <div className="w-20 h-20 bg-white/60 rounded-full flex items-center justify-center mb-4 shadow-inner">
                     <AlertCircle size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">No Requests Found</h3>
                  <p className="text-slate-500 max-w-xs text-sm font-medium">Try adjusting your filters or search terms.</p>
               </div>
            ) : (
               (paginatedRequests || []).map(req => (
                  <RequestCard key={req.id} request={req} />
               ))
            )}
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm">
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
