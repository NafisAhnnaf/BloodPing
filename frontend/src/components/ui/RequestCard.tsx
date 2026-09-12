import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Clock, Activity, Users, Settings, Navigation } from 'lucide-react';
import { BloodRequest, useAppData } from '../../context/AppDataContext';
import { useRole } from '../../context/RoleContext';
import { RequestDetailsModal } from './RequestDetailsModal';
import { ManageRequestModal } from './ManageRequestModal';

interface RequestCardProps {
  request: BloodRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const { currentUser } = useAppData();
  const { role } = useRole();
  const [showDetails, setShowDetails] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    setShowDetails(false);
    setShowManage(false);
  }, [role]);

  const progressPercentage = Math.min(100, (request.unitsFulfilled / request.unitsRequired) * 100);

  // Time ago logic (Facebook style)
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days < 30) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (months < 12) {
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  };
  const timeAgoText = formatTimeAgo(request.date);
  const deadlineDate = new Date(request.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const hasApplied = request.applications.some(app => app.donorId === currentUser.id);
  const userApp = request.applications.find(app => app.donorId === currentUser.id);

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl p-5 flex flex-col gap-4 shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:bg-white/50 transition-all duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg overflow-hidden border-2 border-white shadow-sm">
            {request.authorName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h3 className="font-extrabold text-slate-900 text-base leading-tight">{request.authorName}</h3>
            <span className="text-xs font-semibold text-slate-500">{timeAgoText}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            {request.urgent && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <Activity size={10} /> Urgent
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm bg-red-600 text-white border border-red-700">
              {request.bloodGroup}
            </span>
          </div>
          {request.status !== 'open' && (
             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold shadow-sm ${
               request.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
             } border`}>
               {request.status}
             </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-1">
        <p className="text-sm font-medium text-slate-700 line-clamp-3">
          {request.description}
        </p>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-600">{request.unitsFulfilled} / {request.unitsRequired} Units Fulfilled</span>
          <span className="text-red-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden shadow-inner border border-white/40">
           <div 
             className={`h-full rounded-full transition-all duration-500 ${request.urgent ? 'bg-red-500' : 'bg-emerald-500'}`} 
             style={{ width: `${progressPercentage}%` }}
           ></div>
        </div>
      </div>

      {/* Meta Info Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-1 text-xs font-bold text-slate-500 bg-white/30 p-2.5 rounded-2xl border border-white/50">
         <div className="flex items-center gap-1.5 md:col-span-1 col-span-2 text-slate-700">
           <MapPin size={14} className="text-red-500 flex-shrink-0" />
           <span className="truncate">{request.hospital}</span>
         </div>
         <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-lg border border-rose-200/60">
           <Navigation size={13} className="text-red-600 flex-shrink-0" />
           <span>{request.distance ? `${Number(request.distance).toFixed(1)} km away` : 'Nearby'}</span>
         </div>
         <div className="flex items-center gap-1.5">
           <Clock size={14} className="text-amber-500 flex-shrink-0" />
           <span>By {deadlineDate}</span>
         </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
          <Users size={16} className="text-slate-400" />
          <span>{request.applications.length} Donors Applied</span>
        </div>
        
        {role === 'donor' ? (
          <button 
            onClick={() => setShowDetails(true)}
            disabled={request.status === 'completed'}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-extrabold transition-all shadow-md active:scale-95 ${
              request.status === 'completed'
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : hasApplied
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-none'
                  : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:from-red-500 hover:to-red-400'
            }`}
          >
            {request.status === 'completed' ? (
              'Completed'
            ) : hasApplied ? (
              <span className="capitalize">{userApp?.status || 'Applied'}</span>
            ) : (
              <>
                <Heart size={16} className="fill-white" />
                View
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={() => setShowManage(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-extrabold transition-all shadow-md active:scale-95 bg-slate-800 text-white hover:bg-slate-900"
          >
            <Settings size={16} /> Manage
          </button>
        )}
      </div>

      {showDetails && <RequestDetailsModal request={request} onClose={() => setShowDetails(false)} />}
      {showManage && <ManageRequestModal request={request} onClose={() => setShowManage(false)} />}
    </div>
  );
}
