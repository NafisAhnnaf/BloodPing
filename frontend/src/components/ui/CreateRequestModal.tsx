import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { BloodRequest, useAppData } from '../../context/AppDataContext';
import { BLOOD_GROUPS } from '../../services/mockData';
import { SelectDropdown } from './SelectDropdown';
import { DatePicker } from './DatePicker';

interface CreateRequestModalProps {
  onClose: () => void;
}

export function CreateRequestModal({ onClose }: CreateRequestModalProps) {
  const { createRequest } = useAppData();
  
  const [form, setForm] = useState<Partial<BloodRequest>>({
    hospital: '',
    bloodGroup: 'A+',
    urgent: false,
    address: '',
    ward: '',
    description: '',
    preferredDistance: 15,
    contact: { phone: '', secondaryPhone: '', email: '' }
  });
  
  const [unitsInput, setUnitsInput] = useState<string>('1');
  const [deadline, setDeadline] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedUnits = parseInt(unitsInput);
    createRequest({
      hospital: form.hospital || '',
      bloodGroup: form.bloodGroup || 'A+',
      unitsRequired: isNaN(parsedUnits) || parsedUnits < 1 ? 1 : parsedUnits,
      urgent: form.urgent || false,
      address: form.address,
      ward: form.ward,
      description: form.description || '',
      preferredDistance: form.preferredDistance || 5,
      contact: form.contact as any,
      deadline: deadline || new Date(Date.now() + 86400000).toISOString(),
      authorName: 'Current User', // Mocked user
      distance: 0, // Initial distance mocked
    });
    onClose();
  };

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
        className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-2xl max-w-lg w-full flex flex-col z-[10000] overflow-visible"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-black !text-slate-900">Create Blood Request</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blood Group</label>
              <SelectDropdown
                value={form.bloodGroup || 'A+'}
                onChange={val => setForm({ ...form, bloodGroup: val })}
                options={BLOOD_GROUPS.filter(g => g !== 'All').map(g => ({ label: g, value: g }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units Required</label>
              <input 
                type="text" value={unitsInput} 
                onChange={e => setUnitsInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Required By Date</label>
            <DatePicker 
              value={deadline}
              onChange={setDeadline}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital / Clinic Name</label>
            <input 
              type="text" value={form.hospital} 
              onChange={e => setForm({ ...form, hospital: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address (City/Street)</label>
              <input 
                type="text" value={form.address} 
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ward / Room / Floor</label>
              <input 
                type="text" value={form.ward} 
                onChange={e => setForm({ ...form, ward: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Primary Phone</label>
              <input 
                type="text" value={form.contact?.phone} 
                onChange={e => setForm({ ...form, contact: { ...form.contact!, phone: e.target.value } })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secondary Phone</label>
              <input 
                type="text" value={form.contact?.secondaryPhone} 
                onChange={e => setForm({ ...form, contact: { ...form.contact!, secondaryPhone: e.target.value } })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" value={form.contact?.email} 
              onChange={e => setForm({ ...form, contact: { ...form.contact!, email: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Preferred Distance Radius</label>
              <span className="text-xs font-extrabold text-red-600">{form.preferredDistance} KM</span>
            </div>
            <input 
              type="range" min="1" max="50" value={form.preferredDistance}
              onChange={e => setForm({ ...form, preferredDistance: parseInt(e.target.value) })}
              className="w-full accent-red-600 mb-2"
            />
            <div className="flex gap-2">
              {[5, 10, 25, 50].map(preset => (
                <button
                  key={preset} type="button"
                  onClick={() => setForm({ ...form, preferredDistance: preset })}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    form.preferredDistance === preset 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {preset}KM
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" checked={form.urgent}
                onChange={e => setForm({ ...form, urgent: e.target.checked })}
                className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-bold text-slate-700">Mark as Urgent / Emergency</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Instructions</label>
            <textarea 
              rows={3} value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500/30"
              required
            />
          </div>
          
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md"
            >
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
