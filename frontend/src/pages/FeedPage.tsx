import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, Search, AlertCircle, Heart, Filter, ChevronLeft, ChevronRight, X, Activity, Crosshair, Loader2, Navigation, RotateCcw
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
import { calculateDistanceKm } from '../utils/geoUtils';

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
  const [isNationwide, setIsNationwide] = useState<boolean>(false);
  const [includeExpired, setIncludeExpired] = useState<boolean>(false);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'routine'>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'deadline' | 'expiring_soonest' | 'urgent' | 'latest' | 'oldest' | 'abc'>('nearest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const effectiveNationwide = isNationwide || sortBy === 'deadline';

  const handleEnableLiveGPS = async () => {
    const pos = await requestLocation();
    if (pos) {
      const coords = { lat: pos.latitude, lng: pos.longitude };
      setLiveCoords(coords);
      await fetchRequests({ lat: coords.lat, lng: coords.lng, radius_km: 200 });
    }
  };

  // Attempt auto-location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLiveCoords(coords);
          fetchRequests({ lat: coords.lat, lng: coords.lng, radius_km: 200 });
        },
        () => {
          // Geolocation prompt dismissed or denied, initial fetch with wide radius
          fetchRequests({ radius_km: 200 });
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      fetchRequests({ radius_km: 200 });
    }
  }, []);

  // Live distance calculation relative to user location (or Dhaka default 23.8103, 90.4125)
  const userLat = liveCoords?.lat ?? 23.8103;
  const userLng = liveCoords?.lng ?? 90.4125;

  const requestsWithLiveDistance = useMemo(() => {
    return requests.map(req => {
      let dist = req.distance;
      if (req.hospitalLat != null && req.hospitalLng != null && !isNaN(req.hospitalLat) && !isNaN(req.hospitalLng)) {
        dist = calculateDistanceKm(userLat, userLng, req.hospitalLat, req.hospitalLng);
      }
      const rounded = typeof dist === 'number' && !isNaN(dist) ? Number(dist.toFixed(1)) : 0;
      return {
        ...req,
        distance: rounded,
        distanceKm: rounded,
      };
    });
  }, [requests, userLat, userLng]);

  const processedRequests = useMemo(() => {
    let result = [...requestsWithLiveDistance];

    // Handle Expired Deadline Check
    const now = Date.now();
    result = result.map(req => {
      const isPastDeadline = Boolean(req.deadline && new Date(req.deadline).getTime() <= now);
      const isExpired = req.status === 'expired' || (req.status === 'open' && isPastDeadline);
      return {
        ...req,
        status: isExpired ? ('expired' as const) : req.status
      };
    });

    // Unless includeExpired is true or it's the owner's request, filter out expired requests from donor feed
    if (!includeExpired) {
      result = result.filter(req => req.isOwner || req.status !== 'expired');
    }

    // Filter by Blood Group
    if (activeGroup !== 'All') {
      result = result.filter(
        req => req.bloodGroup?.trim().toUpperCase() === activeGroup.trim().toUpperCase()
      );
    }

    // Filter by Search Query (hospital, address, ward, bloodGroup, description, authorName)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(req => {
        const hospital = (req.hospital || '').toLowerCase();
        const address = (req.address || '').toLowerCase();
        const ward = (req.ward || '').toLowerCase();
        const bloodGroup = (req.bloodGroup || '').toLowerCase();
        const description = (req.description || '').toLowerCase();
        const authorName = (req.authorName || '').toLowerCase();
        return (
          hospital.includes(q) ||
          address.includes(q) ||
          ward.includes(q) ||
          bloodGroup.includes(q) ||
          description.includes(q) ||
          authorName.includes(q)
        );
      });
    }

    // Filter by Urgency
    if (urgencyFilter === 'urgent') {
      result = result.filter(req => Boolean(req.urgent));
    } else if (urgencyFilter === 'routine') {
      result = result.filter(req => !req.urgent);
    }

    // Filter by Distance: When not nationwide, strictly respect maxDistance
    if (!effectiveNationwide) {
      result = result.filter(req => {
        if (req.distance == null || isNaN(req.distance)) return true;
        return req.distance <= maxDistance;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'nearest') {
        const distA = a.distance ?? 999999;
        const distB = b.distance ?? 999999;
        if (distA !== distB) return distA - distB;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortBy === 'deadline') {
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : 0;
        if (deadlineB !== deadlineA) return deadlineB - deadlineA; // Latest deadline first (all over country)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortBy === 'expiring_soonest') {
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (deadlineA !== deadlineB) return deadlineA - deadlineB; // Soonest deadline first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortBy === 'urgent') {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        const distA = a.distance ?? 999999;
        const distB = b.distance ?? 999999;
        if (distA !== distB) return distA - distB;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortBy === 'abc') {
        return (a.hospital || '').localeCompare(b.hospital || '');
      }

      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (sortBy === 'latest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;

      return 0;
    });

    return result;
  }, [requestsWithLiveDistance, activeGroup, searchQuery, maxDistance, effectiveNationwide, includeExpired, urgencyFilter, sortBy]);

  const distantRequestsCount = useMemo(() => {
    let candidate = [...requestsWithLiveDistance];
    if (!includeExpired) {
      const now = Date.now();
      candidate = candidate.filter(req => req.isOwner || !(req.status === 'expired' || (req.status === 'open' && req.deadline && new Date(req.deadline).getTime() <= now)));
    }
    if (activeGroup !== 'All') {
      candidate = candidate.filter(req => req.bloodGroup?.trim().toUpperCase() === activeGroup.trim().toUpperCase());
    }
    return candidate.filter(req => req.distance > maxDistance).length;
  }, [requestsWithLiveDistance, activeGroup, maxDistance, includeExpired]);

  const handleResetFilters = () => {
    setActiveGroup('All');
    setSearchQuery('');
    setMaxDistance(50);
    setIsNationwide(false);
    setIncludeExpired(false);
    setUrgencyFilter('all');
    setSortBy('nearest');
  };

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
                        <div>
                          <p className="text-4xl font-black">
                            0 <span className="text-xl font-bold opacity-80">days</span>
                          </p>
                          <span className="inline-block mt-1 text-[11px] font-bold text-emerald-100 bg-emerald-700/40 px-2.5 py-0.5 rounded-full border border-emerald-300/30">
                            Eligible Now
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
                    placeholder="Search hospitals, locations, blood groups..."
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
                    {/* Distance / Range Controls */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase text-left">Search Range</label>
                        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setIsNationwide(false)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              !effectiveNationwide
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Within Radius
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsNationwide(true)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              effectiveNationwide
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            All Over Country
                          </button>
                        </div>
                      </div>

                      {!effectiveNationwide ? (
                        <RangeSlider 
                          label="Distance"
                          value={maxDistance}
                          min={1}
                          max={100}
                          unit="km"
                          marks={[10, 25, 50, 75]}
                          onChange={setMaxDistance}
                        />
                      ) : (
                        <div className="p-3 bg-red-50/70 border border-red-200/60 rounded-xl text-xs font-semibold text-red-800">
                          Showing blood donation requests nationwide from all regions of Bangladesh.
                        </div>
                      )}
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
                          { label: 'Routine', value: 'routine' }
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
                          { label: 'Latest Deadline First (All Over Country)', value: 'deadline' },
                          { label: 'Expiring Soonest First (Urgent)', value: 'expiring_soonest' },
                          { label: 'Most Urgent First', value: 'urgent' },
                          { label: 'Latest First (Newest)', value: 'latest' },
                          { label: 'Oldest First', value: 'oldest' },
                          { label: 'Alphabetical (A-Z)', value: 'abc' }
                        ]}
                      />
                    </div>

                    <div className="h-px w-full bg-orange-100/60" />

                    {/* Include Expired Requests Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Include Expired Requests</span>
                        <span className="text-[11px] text-slate-500 font-medium">Show past requests whose deadline has passed</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeExpired(!includeExpired)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          includeExpired ? 'bg-red-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            includeExpired ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                {effectiveNationwide
                  ? 'All Over Country (Nationwide Feed)'
                  : liveCoords
                    ? `Live GPS Active (Within ${maxDistance} km)`
                    : `Ranked by Proximity (Within ${maxDistance} km)`}
              </span>
            </div>
            {!effectiveNationwide && (
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
            )}
          </div>

          {/* Vertical Feed Content */}
          <section className="flex flex-col gap-4">
            {paginatedRequests.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                     <MapPin size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No Requests Found</h3>
                  <p className="text-slate-600 max-w-sm text-sm font-medium mb-4">
                    {!effectiveNationwide && distantRequestsCount > 0
                      ? `No requests match your filters within ${maxDistance} km (${distantRequestsCount} request${distantRequestsCount === 1 ? '' : 's'} available further away in Bangladesh).`
                      : 'No donation requests match your selected filters and search query.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {!effectiveNationwide && distantRequestsCount > 0 && (
                      <button
                        onClick={() => setIsNationwide(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Show All Over Country
                      </button>
                    )}
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 px-4 py-2 bg-white/80 hover:bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all shadow-sm"
                    >
                      <RotateCcw size={13} />
                      Reset Filters
                    </button>
                  </div>
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
