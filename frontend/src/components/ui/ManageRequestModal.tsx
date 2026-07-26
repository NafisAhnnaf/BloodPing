import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CheckCircle, Edit2, Trash2, AlertTriangle, ChevronDown, ChevronUp, Download, Phone } from 'lucide-react';
import { BloodRequest, useAppData, ApplicationStatus, Donor } from '../../context/AppDataContext';
import { ConfirmActionModal } from './ConfirmActionModal';
import { DatePicker } from './DatePicker';

interface ManageRequestModalProps {
  request: BloodRequest;
  onClose: () => void;
}

export function ManageRequestModal({ request, onClose }: ManageRequestModalProps) {
  const { updateApplicationStatus, updateRequest, deleteRequest, donors } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedDonorId, setExpandedDonorId] = useState<number | null>(null);
  
  const [unitsInput, setUnitsInput] = useState<string>(request.unitsRequired.toString());

  const [confirmAction, setConfirmAction] = useState<{
    donorId: number;
    status: ApplicationStatus;
    title: string;
    message: string;
  } | null>(null);

  const [editForm, setEditForm] = useState<Partial<BloodRequest>>({
    unitsRequired: request.unitsRequired,
    hospital: request.hospital,
    address: request.address || '',
    ward: request.ward || '',
    description: request.description,
    urgent: request.urgent,
    contact: { ...request.contact } as any,
    preferredDistance: request.preferredDistance || 5,
    deadline: request.deadline ? request.deadline.split('T')[0] : '',
  });

  const handleSaveEdit = () => {
    const parsedUnits = parseInt(unitsInput);
    updateRequest(request.id, {
      ...editForm,
      unitsRequired: isNaN(parsedUnits) || parsedUnits < 1 ? 1 : parsedUnits,
      deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : request.deadline,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteRequest(request.id);
    onClose();
  };

  const handleActionClick = (donorId: number, status: ApplicationStatus) => {
    if (status === 'accepted') {
      setConfirmAction({
        donorId, status,
        title: 'Accept Applicant',
        message: 'Are you sure you want to accept this donor? You will be able to contact them.'
      });
    } else if (status === 'rejected') {
      setConfirmAction({
        donorId, status,
        title: 'Reject Applicant',
        message: 'Are you sure you want to reject this donor application?'
      });
    } else if (status === 'completed') {
      setConfirmAction({
        donorId, status,
        title: 'Mark as Done',
        message: 'Are you sure you want to mark this donation as fulfilled? This will update the unit count and award leaderboard points to the donor.'
      });
    } else if (status === 'canceled') {
      setConfirmAction({
        donorId, status,
        title: 'Cancel Acceptance',
        message: 'Cancel acceptance for this donor? No penalties will be applied.'
      });
    }
  };

  const confirmPendingAction = () => {
    if (confirmAction) {
      updateApplicationStatus(request.id, confirmAction.donorId, confirmAction.status);
      setConfirmAction(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmAction) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, confirmAction]);

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-2xl max-w-lg w-full flex flex-col z-[10000]"
          onClick={e => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-black !text-slate-900">
                {isEditing ? 'Edit Request' : isDeleting ? 'Delete Request' : 'Manage Request'}
              </h2>
              <p className="text-sm font-bold !text-slate-800">
                {request.unitsFulfilled} / {request.unitsRequired} Units Fulfilled
              </p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          {!isEditing && !isDeleting && (
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                <Edit2 size={16} /> Edit Request
              </button>
              <button 
                onClick={() => setIsDeleting(true)}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors"
              >
                <Trash2 size={16} /> Delete Request
              </button>
            </div>
          )}

          {isDeleting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <AlertTriangle size={48} className="text-red-500 mb-4" />
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Are you absolutely sure?</h3>
              <p className="text-sm text-slate-600 mb-8 max-w-sm">This action cannot be undone. This will permanently delete your blood request and remove all donor applications.</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital / Clinic</label>
                  <input 
                    type="text" value={editForm.hospital} 
                    onChange={e => setEditForm(prev => ({ ...prev, hospital: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units Needed</label>
                    <input 
                      type="text" value={unitsInput} 
                      onChange={e => setUnitsInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Required By Date</label>
                    <DatePicker 
                      value={editForm.deadline || ''}
                      onChange={val => setEditForm(prev => ({ ...prev, deadline: val }))}
                    />
                  </div>
                </div>
                <div className="flex items-center mt-1 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" checked={editForm.urgent}
                      onChange={e => setEditForm(prev => ({ ...prev, urgent: e.target.checked }))}
                      className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Urgent Request</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address</label>
                  <input 
                    type="text" value={editForm.address} 
                    onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Primary Phone</label>
                    <input 
                      type="text" value={editForm.contact?.phone} 
                      onChange={e => setEditForm(prev => ({ ...prev, contact: { ...prev.contact!, phone: e.target.value } }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secondary Phone</label>
                    <input 
                      type="text" value={editForm.contact?.secondaryPhone || ''} 
                      onChange={e => setEditForm(prev => ({ ...prev, contact: { ...prev.contact!, secondaryPhone: e.target.value } }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Preferred Distance Radius</label>
                    <span className="text-xs font-extrabold text-red-600">{editForm.preferredDistance} KM</span>
                  </div>
                  <input 
                    type="range" min="1" max="50" value={editForm.preferredDistance}
                    onChange={e => setEditForm(prev => ({ ...prev, preferredDistance: parseInt(e.target.value) }))}
                    className="w-full accent-red-600 mb-2"
                  />
                  <div className="flex gap-2">
                    {[5, 10, 25, 50].map(preset => (
                      <button
                        key={preset} type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, preferredDistance: preset }))}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          editForm.preferredDistance === preset 
                            ? 'bg-red-50 border-red-200 text-red-700' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {preset}KM
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                  <textarea 
                    rows={3} value={editForm.description} 
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {!isEditing && !isDeleting && (
            <>
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner mb-6 flex-shrink-0">
                 <div 
                   className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                   style={{ width: `${Math.min(100, (request.unitsFulfilled / request.unitsRequired) * 100)}%` }}
                 ></div>
              </div>

              {/* Applicants List */}
              <div className="flex-1 space-y-3">
            {request.applications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 font-bold text-sm">No donors have applied yet.</p>
              </div>
            ) : (
              request.applications.map((app, idx) => {
                const donor = donors.find(d => d.id === app.donorId);
                if (!donor) return null;

                const isExpanded = expandedDonorId === donor.id;

                return (
                  <div key={idx} className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:bg-white/80">
                    <div 
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedDonorId(isExpanded ? null : donor.id)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center text-slate-600 font-bold">
                          {donor.name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-extrabold text-slate-800 truncate">{donor.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 uppercase tracking-wider">
                              {donor.bloodType}
                            </span>
                            {donor.phone && (
                              <a 
                                href={`tel:${donor.phone}`} 
                                onClick={e => e.stopPropagation()} 
                                className="hidden sm:flex text-[11px] font-bold text-slate-500 hover:text-red-600 items-center gap-1 transition-colors"
                              >
                                <Phone size={10} /> {donor.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {app.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleActionClick(donor.id, 'rejected')}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleActionClick(donor.id, 'accepted')}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 shadow-md transition-colors"
                            >
                              Accept
                            </button>
                          </>
                        )}
                        
                        {app.status === 'accepted' && (
                          <>
                            <button 
                              onClick={() => handleActionClick(donor.id, 'canceled')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleActionClick(donor.id, 'completed')}
                              className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm flex items-center justify-center gap-1 transition-colors"
                            >
                              <Check size={14} className="stroke-[3]" /> Mark Done
                            </button>
                          </>
                        )}

                        {app.status === 'completed' && (
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}

                        {app.status === 'rejected' && (
                          <span className="text-xs font-bold text-slate-400 px-3 py-1.5">
                            Rejected
                          </span>
                        )}
                        
                        {app.status === 'canceled' && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                            Canceled
                          </span>
                        )}

                        <div 
                          className="ml-2 text-slate-400 cursor-pointer p-1 hover:bg-slate-100 rounded-full transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDonorId(isExpanded ? null : donor.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 mt-2">
                        {donor.phone && (
                          <div className="mt-4 mb-2">
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Contact Number</span>
                            <a href={`tel:${donor.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                              <Phone size={14} className="text-slate-400" /> {donor.phone}
                            </a>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-700 mb-4 mt-4">
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Age</span>
                            {donor.age ? `${donor.age} yrs` : 'N/A'}
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Occupation</span>
                            {donor.occupation || 'N/A'}
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Leaderboard Score</span>
                            {donor.units * 50} pts
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Last Donated</span>
                            {donor.lastDonated || 'Never'}
                          </div>
                        </div>

                        {app.status === 'canceled' && app.cancelReason && (
                          <div className="mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                            <span className="block text-[10px] text-rose-500 uppercase tracking-wider mb-1 font-bold">Cancellation Reason</span>
                            <p className="text-xs text-rose-700 font-medium">{app.cancelReason}</p>
                          </div>
                        )}

                        {donor.medicalDocUrl && (
                          <a 
                            href={`data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLYyMDKxMzAwM1AwMFQz1jIxMTfSNTBQA3FwQhwplbmRzdHJlYW0KZW5kb2JqCg==`} 
                            download="Medical_Clearance.pdf"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} />
                            Download Medical Clearance Document
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          </>
          )}

        </div>
      </div>
      
      {confirmAction && (
        <ConfirmActionModal 
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmPendingAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>,
    document.body
  );
}
