import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { ApplicationStatus } from '../../context/AppDataContext';

interface CancelApplicationModalProps {
  status: ApplicationStatus;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function CancelApplicationModal({ status, onConfirm, onClose }: CancelApplicationModalProps) {
  const [reason, setReason] = useState('');

  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-black !text-slate-900">Cancel Application</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {status === 'accepted' && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-bold text-amber-800 leading-tight">
              ⚠️ Warning: Canceling after being accepted directly impacts the recipient. A penalty of -5 Leaderboard Points will be applied.
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Please specify your reason for canceling...
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/60 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
            placeholder="I have a scheduling conflict..."
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className={`flex-1 py-3 px-4 rounded-xl font-extrabold shadow-md transition-all ${
              !reason.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-red-600 text-white hover:bg-red-500 active:scale-95'
            }`}
          >
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
