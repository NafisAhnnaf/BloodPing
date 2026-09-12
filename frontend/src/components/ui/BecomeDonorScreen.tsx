import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertTriangle, ShieldCheck, FileText, ArrowLeft, X, CheckCircle2, FileCheck, ExternalLink } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import apiClient from '../../services/apiClient';
import { SelectDropdown } from './SelectDropdown';
import { BLOOD_GROUPS } from '../../services/mockData';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function BecomeDonorScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { 
    isDonorApproved,
    donorApplicationStatus, 
    rejectionReason, 
    refreshRoleStatus 
  } = useRole();

  const [bloodGroup, setBloodGroup] = useState('A+');
  const [travelRadius, setTravelRadius] = useState(15);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFormAnyway, setShowFormAnyway] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [applicationDetails, setApplicationDetails] = useState<{
    document_url?: string | null;
    blood_group?: string | null;
    travel_radius_km?: number | null;
    applied_at?: string | null;
  } | null>(null);

  const filteredBloodGroups = BLOOD_GROUPS.filter(bg => bg !== 'All');

  // Fetch current detailed application status on mount
  useEffect(() => {
    apiClient.get('/donors/status')
      .then(res => {
        if (res.data?.has_applied) {
          setApplicationDetails({
            document_url: res.data.document_url,
            blood_group: res.data.blood_group,
            travel_radius_km: res.data.travel_radius_km,
            applied_at: res.data.applied_at
          });
          if (res.data.blood_group) setBloodGroup(res.data.blood_group);
          if (res.data.travel_radius_km) setTravelRadius(res.data.travel_radius_km);
        }
      })
      .catch(err => console.debug('Status check:', err));
  }, [donorApplicationStatus]);

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg(null);

    // Validate mime type or extension
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = fileExt && ['pdf', 'png', 'jpg', 'jpeg'].includes(fileExt);
    const isAllowedType = ALLOWED_MIME_TYPES.includes(selectedFile.type);

    if (!isAllowedType && !isAllowedExt) {
      setErrorMsg('Invalid file format. Please upload a PDF, PNG, or JPG document.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File size exceeds 5MB limit (${formatFileSize(selectedFile.size)}). Please choose a smaller file.`);
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please upload a valid medical clearance document or blood test report.');
      return;
    }
    if (!session?.user?.id) {
      setErrorMsg('Session expired or authentication error. Please log in again.');
      return;
    }

    setUploading(true);
    setUploadProgressMsg('Uploading document to secure storage...');
    setErrorMsg(null);

    try {
      // 1. Upload to Supabase Storage bucket 'medical-documents'
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${session.user.id}/${Date.now()}_${cleanName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: file.type || 'application/pdf'
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // 2. Retrieve public URL
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);

      const documentUrl = urlData.publicUrl;

      // 3. Register application on FastAPI backend
      setUploadProgressMsg('Registering donor application...');
      await apiClient.post('/donors/apply', {
        blood_group: bloodGroup,
        travel_radius_km: travelRadius,
        document_url: documentUrl
      });

      // 4. Synchronize context state
      await refreshRoleStatus();
      setShowFormAnyway(false);
      setFile(null);
    } catch (err: any) {
      console.error('Donor application error:', err);
      let msg = 'An unexpected error occurred during submission.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') msg = detail;
        else if (Array.isArray(detail)) msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  const renderContent = () => {
    // STATE 4: Approved Verified Donor
    if (donorApplicationStatus === 'approved' || isDonorApproved) {
      return (
        <div className="flex flex-col items-center text-center p-8 bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl max-w-md mx-auto animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600 shadow-sm">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Verified Donor</h3>
          <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
            Your donor profile is active and verified! You can now toggle to Donor mode and respond to urgent blood donation requests.
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98"
          >
            Go to Requests Feed
          </button>
        </div>
      );
    }

    // STATE 2: Application Under Review (Pending)
    if (donorApplicationStatus === 'pending' && !showFormAnyway) {
      const appliedDate = applicationDetails?.applied_at 
        ? new Date(applicationDetails.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : null;

      return (
        <div className="flex flex-col items-center text-center p-8 bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl max-w-md mx-auto animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-amber-600 animate-pulse shadow-sm">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Application Under Review</h3>
          <p className="text-sm font-semibold text-slate-500 mb-4 leading-relaxed">
            Our medical verification team is currently validating your uploaded medical records. We will notify you once your verification badge is issued.
          </p>

          <div className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold text-slate-500 border border-slate-100 flex flex-col gap-2 mb-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Review Status</span>
              <span className="flex items-center gap-1.5 text-amber-600 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Awaiting Admin Review
              </span>
            </div>
            {appliedDate && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Submitted On</span>
                <span className="text-slate-700">{appliedDate}</span>
              </div>
            )}
            {applicationDetails?.blood_group && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Blood Group</span>
                <span className="text-red-600 font-extrabold">{applicationDetails.blood_group}</span>
              </div>
            )}
          </div>

          {applicationDetails?.document_url && (
            <a
              href={applicationDetails.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 mb-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <FileText size={14} className="text-red-500" />
              View Uploaded Document <ExternalLink size={12} className="text-slate-400" />
            </a>
          )}

          <button
            onClick={() => navigate('/feed')}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-98"
          >
            Return to Requests Feed
          </button>
        </div>
      );
    }

    // STATE 3: Application Rejected
    if (donorApplicationStatus === 'rejected' && !showFormAnyway) {
      return (
        <div className="flex flex-col items-center text-center p-8 bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl max-w-md mx-auto animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600 shadow-sm">
            <AlertTriangle size={36} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Verification Failed</h3>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 w-full text-left">
            <h4 className="text-[10px] font-black text-red-700 uppercase tracking-wider mb-1">Reason for Rejection:</h4>
            <p className="text-xs font-semibold text-red-600 leading-snug">
              {rejectionReason || 'Uploaded document was illegible, expired, or failed verification criteria.'}
            </p>
          </div>
          <button
            onClick={() => setShowFormAnyway(true)}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-md shadow-red-500/10 transition-all active:scale-98"
          >
            Submit New Application
          </button>
        </div>
      );
    }

    // STATE 1: Application Form (Not Applied or Re-applying)
    return (
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="text-center sm:text-left">
            <h3 className="text-2xl font-black text-slate-800 mb-1">Apply to Become a Donor</h3>
            <p className="text-xs font-semibold text-slate-500">
              Submit your medical report to verify your blood group and unlock the verified Donor badge.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* File Upload / Selected File Area */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Medical Clearance Document
            </label>

            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-red-50/10 transition-colors group cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload size={36} className="text-slate-400 group-hover:text-red-500 transition-colors mb-2" />
                <span className="text-xs font-bold text-slate-700 text-center">
                  Click to select blood report or clearance document
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-1">Supports PDF, PNG, JPG (Max 5MB)</span>
              </div>
            ) : (
              <div className="border border-slate-200 bg-slate-50/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                    <FileCheck size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Valid file
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove selected file"
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-500/10 transition-all flex items-center justify-center disabled:opacity-50 mt-2"
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{uploadProgressMsg || 'Uploading...'}</span>
              </div>
            ) : (
              'Submit Verification Request'
            )}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto">
      <div className="w-full flex items-center justify-start mb-4">
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-red-600 transition-colors bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/60 shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Requests Feed
        </button>
      </div>
      {renderContent()}
    </div>
  );
}
