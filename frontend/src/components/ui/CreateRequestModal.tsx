import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Crosshair, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { BloodRequest, useAppData } from '../../context/AppDataContext';
import { BLOOD_GROUPS } from '../../services/mockData';
import { SelectDropdown } from './SelectDropdown';
import { DatePicker } from './DatePicker';
import { useGeolocation } from '../../hooks/useGeolocation';
import { geocodingService, GeocodingResult } from '../../services/geocodingService';

interface CreateRequestModalProps {
  onClose: () => void;
}

export function CreateRequestModal({ onClose }: CreateRequestModalProps) {
  const { createRequest } = useAppData();
  const { requestLocation, loading: geoLoading } = useGeolocation();
  
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

  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null
  });
  const [isResolving, setIsResolving] = useState(false);
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  const [unitsInput, setUnitsInput] = useState<string>('1');
  const [deadline, setDeadline] = useState<string>('');

  const handleUseMyGPS = async () => {
    setIsResolving(true);
    const pos = await requestLocation();
    if (pos) {
      setCoords({ latitude: pos.latitude, longitude: pos.longitude });
      const addressName = await geocodingService.reverseGeocode(pos.latitude, pos.longitude);
      setForm(prev => ({
        ...prev,
        address: addressName,
        hospital: prev.hospital || `Clinic/Hospital near ${addressName}`
      }));
    }
    setIsResolving(false);
  };

  const handleAddressSearch = async (val: string) => {
    setForm(prev => ({ ...prev, address: val }));
    if (val.trim().length >= 3) {
      setIsSearchingAddress(true);
      const res = await geocodingService.searchAddress(val);
      setAddressResults(res);
      setIsSearchingAddress(false);
    } else {
      setAddressResults([]);
    }
  };

  const selectAddress = (item: GeocodingResult) => {
    setCoords({ latitude: item.latitude, longitude: item.longitude });
    setForm(prev => ({ ...prev, address: item.displayName }));
    setAddressResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedUnits = parseInt(unitsInput);
    createRequest({
      hospital: form.hospital || '',
      bloodGroup: form.bloodGroup || 'A+',
      unitsRequired: isNaN(parsedUnits) || parsedUnits < 1 ? 1 : parsedUnits,
      urgent: form.urgent || false,
      address: form.address,
      hospitalLat: coords.latitude ?? 23.8103,
      hospitalLng: coords.longitude ?? 90.4125,
      ward: form.ward,
      description: form.description || '',
      preferredDistance: form.preferredDistance || 15,
      contact: form.contact as any,
      deadline: deadline || new Date(Date.now() + 86400000).toISOString(),
      authorName: 'Current User', // Mocked user
      distance: 0,
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Hospital / Clinic Name</label>
              <button
                type="button"
                onClick={handleUseMyGPS}
                disabled={geoLoading || isResolving}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {geoLoading || isResolving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Detecting GPS...
                  </>
                ) : (
                  <>
                    <Crosshair className="h-3.5 w-3.5" />
                    Use Current GPS
                  </>
                )}
              </button>
            </div>
            <input 
              type="text" value={form.hospital} 
              onChange={e => setForm({ ...form, hospital: e.target.value })}
              placeholder="e.g. Dhaka Medical College Hospital"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
              required
            />
            {coords.latitude && coords.longitude && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 inline" />
                Target GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 relative">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address (City/Street)</label>
              <input 
                type="text" value={form.address} 
                onChange={e => handleAddressSearch(e.target.value)}
                placeholder="Search hospital street or city..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500/30"
                required
              />
              {isSearchingAddress && (
                <div className="absolute right-3 top-8">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                </div>
              )}
              {addressResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-100">
                  {addressResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectAddress(item)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 hover:bg-rose-50 transition-colors"
                    >
                      <p className="truncate font-semibold">{item.displayName}</p>
                    </button>
                  ))}
                </div>
              )}
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
