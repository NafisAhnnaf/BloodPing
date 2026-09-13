import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, MapPin, Activity, Clock, Settings, Navigation, AlertCircle } from 'lucide-react';
import { BloodRequest, useAppData } from '../../context/AppDataContext';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmActionModal } from './ConfirmActionModal';
import { CancelApplicationModal } from './CancelApplicationModal';

interface RequestDetailsModalProps {
  request: BloodRequest;
  onClose: () => void;
  onManage?: () => void;
}

export function RequestDetailsModal({ request, onClose, onManage }: RequestDetailsModalProps) {
  const { applyToRequest, currentUser, cancelApplication } = useAppData();
  const authUser = useAuthStore(state => state.session?.user);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isOwner = Boolean(
    request.isOwner ?? 
    (authUser && (
      (request.recipientUserId && String(request.recipientUserId) === String(authUser.id)) || 
      (request.ownerId && String(request.ownerId) === String(authUser.id))
    ))
  );

  const handleApply = async () => {
    try {
      await applyToRequest(request.id);
      setShowConfirm(false);
      onClose();
    } catch (e) {
      // alert handled in applyToRequest
    }
  };

  const handleCancelApplication = async (reason: string) => {
    try {
      await cancelApplication(request.id, reason);
      setShowCancelModal(false);
      onClose();
    } catch (e) {
      // alert handled in cancelApplication
    }
  };

  const myApp = request.applications.find(app => 
    String(app.donorId) === String(currentUser?.id) ||
    (app.donorUserId && String(app.donorUserId) === String(currentUser?.id)) ||
    (app.donorProfileId && String(app.donorProfileId) === String(currentUser?.id))
  );
  const hasApplied = !!myApp;
  const isExpired = Boolean(
    request.status === 'expired' || 
    (request.status === 'open' && request.deadline && new Date(request.deadline).getTime() <= Date.now())
  );
  const isCancellable = myApp && (myApp.status === 'pending' || myApp.status === 'accepted');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 z-[10000]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-black !text-slate-900">Request Details</h2>
            <p className="text-sm font-bold !text-slate-800">{request.hospital}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {isExpired && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span>This blood request has expired and is no longer accepting donor applications.</span>
          </div>
        )}

        {/* Info Rows */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested By</span>
            <span className="text-sm font-extrabold text-slate-800">{request.authorName}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</span>
            <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-lg text-sm font-black border border-red-200">
              {request.bloodGroup}
            </span>
          </div>

          {/* Location Information */}
          <div className="p-3 bg-white/60 rounded-xl border border-slate-100">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</span>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800">{request.hospital}</p>
                  {request.address && <p className="text-xs font-medium text-slate-600">{request.address}</p>}
                  {request.ward && <p className="text-xs font-medium text-slate-600">Ward: {request.ward}</p>}
                  {request.distance != null && !isNaN(Number(request.distance)) && (
                    <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 w-fit mt-1.5">
                      <Navigation size={11} className="text-rose-600" />
                      <span>{Number(request.distance) === 0 ? 'Nearby (< 0.1 km)' : `${Number(request.distance).toFixed(1)} km away`}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white/60 rounded-xl border border-slate-100">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</span>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{request.description}</p>
          </div>

          {request.contact && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 space-y-2">
              <span className="block text-xs font-bold text-amber-700/70 uppercase tracking-wider mb-1">Contact Information</span>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Phone size={16} className="text-amber-500" />
                <span>Primary: {request.contact.phone}</span>
              </div>
              {request.contact.secondaryPhone && (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Phone size={16} className="text-amber-500 opacity-60" />
                  <span>Alt: {request.contact.secondaryPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Mail size={16} className="text-amber-500" />
                <span>{request.contact.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          {isCancellable ? (
            <button 
              onClick={() => setShowCancelModal(true)}
              className="flex-1 py-3 px-4 rounded-xl font-extrabold shadow-md transition-all bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 active:scale-95"
            >
              Cancel Application
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          )}

          {isOwner && onManage ? (
            <button 
              onClick={onManage}
              className="flex-1 py-3 px-4 rounded-xl font-extrabold shadow-md transition-all bg-slate-900 text-white hover:bg-slate-800 active:scale-95 flex items-center justify-center gap-2"
            >
              <Settings size={16} /> Manage Request
            </button>
          ) : (
            <button 
              onClick={() => setShowConfirm(true)}
              disabled={hasApplied || request.status === 'completed' || request.status === 'fulfilled' || isExpired}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold shadow-md transition-all ${
                hasApplied || request.status === 'completed' || request.status === 'fulfilled' || isExpired
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 active:scale-95'
              }`}
            >
              {isExpired
                ? 'Deadline Expired'
                : hasApplied 
                  ? (myApp?.status === 'canceled' ? 'Canceled' : 'Already Applied') 
                  : (request.status === 'completed' || request.status === 'fulfilled') ? 'Fulfilled' : 'Apply to Donate'}
            </button>
          )}
        </div>

      </div>
      
      {showConfirm && (
        <ConfirmActionModal 
          title="Apply to Donate"
          message="Are you sure you want to apply to donate for this request? The recipient will receive your details."
          onConfirm={handleApply}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showCancelModal && myApp && (
        <CancelApplicationModal
          status={myApp.status}
          onConfirm={handleCancelApplication}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>,
    document.body
  );
}
