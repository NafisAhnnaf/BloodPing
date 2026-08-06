import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import apiClient from '../../services/apiClient';
import { SelectDropdown } from './SelectDropdown';
import { BLOOD_GROUPS } from '../../services/mockData';

interface DonorApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonorApplicationModal({ isOpen, onClose }: DonorApplicationModalProps) {
  const { session } = useAuth();
  const { 
    donorApplicationStatus, 
    rejectionReason, 
    refreshRoleStatus 
  } = useRole();

  const [bloodGroup, setBloodGroup] = useState('A+');
  const [travelRadius, setTravelRadius] = useState(15);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFormAnyway, setShowFormAnyway] = useState(false);

  if (!isOpen) return null;

  // Filter out the 'All' option from blood groups for donation purposes
  const filteredBloodGroups = BLOOD_GROUPS.filter(bg => bg !== 'All');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please upload a valid medical document or blood test report.');
      return;
    }
    if (!session?.user?.id) {
      setErrorMsg('Authentication error. Please log in again.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      // 1. Upload file to Supabase Storage bucket 'medical-documents'
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // 2. Fetch the public URL of the uploaded document
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);

      const documentUrl = urlData.publicUrl;

      // 3. Post application details to backend /donors/apply
      await apiClient.post('/donors/apply', {
        blood_group: bloodGroup,
        travel_radius_km: travelRadius,
        document_url: documentUrl
      });

      // 4. Refresh role context state
      await refreshRoleStatus();
      setShowFormAnyway(false);
    } catch (err: any) {
      console.error('Donor application error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setUploading(false);
    }
  };

  const renderContent = () => {
    // If user has a pending application
    if (donorApplicationStatus === 'pending' && !showFormAnyway) {
      return (
        <div className="flex flex-col items-center text-center py-6 px-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4 text-orange-600 animate-pulse">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Application Under Review</h3>
          <p className="text-sm font-semibold text-slate-500 max-w-sm mb-6 leading-relaxed">
            Our administrator team is currently validating your uploaded medical records. We will notify you once your verification badge is issued.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
          >
            Close Window
          </button>
        </div>
      );
    }

    // If user application was rejected
    if (donorApplicationStatus === 'rejected' && !showFormAnyway) {
      return (
        <div className="flex flex-col items-center text-center py-6 px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Application Rejected</h3>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 w-full text-left">
            <h4 className="text-xs font-black text-red-700 uppercase tracking-wider mb-1">Reason for Rejection:</h4>
            <p className="text-sm font-semibold text-red-600 leading-snug">
              {rejectionReason || 'Uploaded document was unreadable or incomplete.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => setShowFormAnyway(true)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-red-500/10 transition-all"
            >
              Submit New Application
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // Default application form
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
        <div>
          <h3 className="text-xl font-black text-slate-800 mb-1">Verify Your Account</h3>
          <p className="text-xs font-semibold text-slate-400">
            Submit your medical records to unlock your verified Donor badge.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold p-3.5 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
            <SelectDropdown
              options={filteredBloodGroups}
              value={bloodGroup}
              onChange={setBloodGroup}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Travel Radius</label>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="range" min="5" max="100" step="5"
                value={travelRadius}
                onChange={e => setTravelRadius(Number(e.target.value))}
                className="w-full accent-red-600"
              />
              <span className="text-xs font-extrabold text-slate-700 w-12 text-right">{travelRadius}km</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Medical Document</label>
          <div className="relative border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-red-50/10 transition-colors group cursor-pointer">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload size={32} className="text-slate-400 group-hover:text-red-500 transition-colors mb-2" />
            <span className="text-xs font-bold text-slate-600 text-center">
              {file ? file.name : 'Upload Blood Test Report or Certificate'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-1">Supports PDF, PNG, JPG (Max 5MB)</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-red-500/10 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
        >
          <X size={16} />
        </button>

        {renderContent()}
      </div>
    </div>
  );
}
