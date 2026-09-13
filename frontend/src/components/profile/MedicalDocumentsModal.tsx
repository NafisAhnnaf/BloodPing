import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, X, UploadCloud, CheckCircle2, Clock, 
  AlertCircle, AlertTriangle, ExternalLink, Calendar, Plus, 
  RefreshCw, Eye, ShieldCheck, ChevronDown
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export interface DonorDocumentRecord {
  id: string;
  document_type: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_review' | 'expired' | string;
  rejection_reason?: string | null;
  document_date?: string | null;
  uploaded_at?: string | null;
  reviewed_at?: string | null;
  source: string;
}

interface MedicalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'blood_test_report', label: 'Blood Test Report' },
  { value: 'identity_proof', label: 'Identity Proof' },
  { value: 'other', label: 'Other Clinical Document' },
];

export function MedicalDocumentsModal({ isOpen, onClose }: MedicalDocumentsModalProps) {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<DonorDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docType, setDocType] = useState('medical_certificate');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Document Preview State
  const [previewDoc, setPreviewDoc] = useState<DonorDocumentRecord | null>(null);

  // 4 months date restriction
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() - 4);
  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDateStr = new Date().toISOString().split('T')[0];

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/donors/documents');
      setDocuments(res.data || []);
    } catch (err: any) {
      console.error('Error fetching donor documents:', err);
      setError(err.response?.data?.detail || 'Failed to load medical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      setShowUploadForm(false);
      setUploadError(null);
      setUploadSuccess(null);
      setPreviewDoc(null);
      setFile(null);
    }
  }, [isOpen, fetchDocuments]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a document or report to upload.');
      return;
    }
    if (!session?.user?.id) {
      setUploadError('User session not found. Please log in again.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // 1. Upload to Supabase Storage bucket 'medical-documents'
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      const { error: uploadErr } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      // 2. Fetch the public URL of the uploaded document
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);

      const documentUrl = urlData.publicUrl;

      // 3. Post to backend /donors/documents
      await apiClient.post('/donors/documents', {
        document_type: docType,
        storage_url: documentUrl,
        document_date: docDate,
      });

      setUploadSuccess('Document uploaded successfully! It is now pending administrative verification.');
      setFile(null);
      setShowUploadForm(false);
      await fetchDocuments();
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      setUploadError(err.response?.data?.detail || err.message || 'Failed to submit document.');
    } finally {
      setUploading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" /> Approved
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={13} className="text-rose-600" /> Rejected
        </span>
      );
    }
    if (s === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <AlertTriangle size={13} className="text-slate-500" /> Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={13} className="text-amber-600" /> Under Review
      </span>
    );
  };

  const isImageFile = (url: string) => {
    return /\.(jpeg|jpg|gif|png|svg|webp)($|\?)/i.test(url);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white/95 border border-white/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Medical Documents</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Uploaded clinical clearance reports & verification certificates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-500">
              {documents.length} {documents.length === 1 ? 'Record' : 'Records'} on file
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDocuments}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Refresh documents list"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(!showUploadForm);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 active:scale-98 transition-all"
              >
                {showUploadForm ? <X size={14} /> : <Plus size={14} />}
                {showUploadForm ? 'Cancel Upload' : 'Upload New Document'}
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {uploadSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchDocuments}
                className="underline text-xs text-rose-700 hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Upload Form Drawer */}
          {showUploadForm && (
            <form
              onSubmit={handleUploadSubmit}
              className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-4 shadow-inner"
            >
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <UploadCloud size={18} className="text-red-500" />
                <h4 className="text-sm font-extrabold text-slate-900">Upload New Medical Record</h4>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Document Type Selection */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                    Document Category
                  </label>
                  <div className="relative">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:border-red-500"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Document Date */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                    Document Issue Date (≤ 4 months)
                  </label>
                  <input
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Document Attachment (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer bg-white border border-slate-200 rounded-xl p-1"
                />
                <p className="text-[10px] font-medium text-slate-400 mt-1">
                  Medical records must be authentic, legible, and certified within the past 4 months.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      <span>Submit Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Document List */}
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Loading medical records...
                </p>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm mb-0.5">No Medical Documents Found</h4>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">
                    You have not uploaded any medical clearance records yet. Uploading verified clinical reports increases recipient trust.
                  </p>
                </div>
                {!showUploadForm && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md shadow-red-600/20 hover:bg-red-500 transition-all"
                  >
                    Upload Document Now
                  </button>
                )}
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                          {doc.document_type}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {doc.source === 'donor_application' ? 'Verification Application' : 'Direct Record'}
                          </span>
                          {doc.uploaded_at && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar size={11} /> {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {renderStatusBadge(doc.status)}
                    </div>
                  </div>

                  {/* Rejection Note */}
                  {doc.rejection_reason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Review Feedback: </span>
                        <span>{doc.rejection_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Document Footer with View and Link Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs font-semibold text-slate-500">
                      {doc.document_date && (
                        <span>Document Date: <strong className="text-slate-700">{doc.document_date}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={13} className="text-slate-500" />
                        <span>Preview</span>
                      </button>
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} className="text-slate-400" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] font-semibold text-amber-800 flex items-start gap-2">
            <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              All medical documents and test reports are encrypted and strictly restricted to authorized platform medical administrators.
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-black text-slate-900 truncate max-w-md">
                  {previewDoc.document_type}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 min-h-[320px] max-h-[500px] flex items-center justify-center overflow-auto">
              {isImageFile(previewDoc.document_url) ? (
                <img
                  src={previewDoc.document_url}
                  alt={previewDoc.document_type}
                  className="max-h-[460px] object-contain rounded-xl shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <FileText className="w-16 h-16 text-red-500/60" />
                  <p className="text-xs font-bold text-slate-700">
                    PDF Document / Clinical Report Attachment
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    This file is stored as a document record. You can view it directly in a dedicated tab.
                  </p>
                  <a
                    href={previewDoc.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
                  >
                    Open Document in New Tab <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={previewDoc.document_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
              >
                Open original in new window <ExternalLink size={13} />
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
