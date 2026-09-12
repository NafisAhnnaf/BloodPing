import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Crosshair, Loader2, CheckCircle2, AlertCircle, Navigation, Search
} from 'lucide-react';
import { RangeSlider } from '../ui/RangeSlider';
import { useGeolocation } from '../../hooks/useGeolocation';
import { geocodingService, GeocodingResult } from '../../services/geocodingService';
import apiClient from '../../services/apiClient';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdated: () => void;
}

export function PreferencesModal({ isOpen, onClose, user, onUpdated }: PreferencesModalProps) {
  const { requestLocation, loading: geoLoading } = useGeolocation();

  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy?: number | null;
  }>({ latitude: null, longitude: null, accuracy: null });
  const [locationSource, setLocationSource] = useState<'browser_gps' | 'nominatim_geocoded' | 'manual'>('browser_gps');
  const [travelRadius, setTravelRadius] = useState<number>(15);

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize from user prop when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setLocationName(user.location_name || '');
      setCoordinates({
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null,
        accuracy: user.accuracy_meters ?? null,
      });
      setTravelRadius(user.travel_radius_km ?? 15);
      setError(null);
      setSuccess(false);
      setShowSearchDropdown(false);
      setSearchResults([]);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleDetectGPS = async () => {
    setError(null);
    setIsResolvingAddress(true);
    const coords = await requestLocation();
    if (coords) {
      setCoordinates(coords);
      setLocationSource('browser_gps');
      const address = await geocodingService.reverseGeocode(coords.latitude, coords.longitude);
      setLocationName(address);
    } else {
      setError('Unable to detect location. Please grant location permissions or type an address below.');
    }
    setIsResolvingAddress(false);
  };

  const handleAddressSearch = async (query: string) => {
    setLocationName(query);
    setError(null);
    if (query.trim().length >= 3) {
      setIsSearching(true);
      setShowSearchDropdown(true);
      const results = await geocodingService.searchAddress(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const selectSearchResult = (item: GeocodingResult) => {
    setCoordinates({ latitude: item.latitude, longitude: item.longitude, accuracy: 50 });
    setLocationSource('nominatim_geocoded');
    setLocationName(item.displayName);
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        date_of_birth: user.date_of_birth,
        phone: user.phone,
        bio: user.bio,
        blood_group: user.blood_group,
        travel_radius_km: travelRadius,
        location_name: locationName.trim() || null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        location_source: locationSource,
        accuracy_meters: coordinates.accuracy || null,
      };

      await apiClient.put('/users/', payload);
      setSuccess(true);
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update preferences:', err);
      setError(err?.response?.data?.detail || 'Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full flex flex-col z-50 overflow-visible relative text-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Navigation size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Preferences</h2>
              <p className="text-xs font-semibold text-slate-500">Update your geolocation & travel radius</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>Preferences updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Geolocation Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Current Location
              </label>
              {coordinates.latitude && coordinates.longitude && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                </span>
              )}
            </div>

            {/* Detect GPS Button */}
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={geoLoading || isResolvingAddress}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {geoLoading || isResolvingAddress ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Detecting GPS Coordinates...</span>
                </>
              ) : (
                <>
                  <Crosshair size={18} />
                  <span>Detect Current Location (GPS)</span>
                </>
              )}
            </button>

            {/* Address input with Nominatim autocomplete */}
            <div className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin size={16} />
                </div>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  placeholder="Or type city / neighborhood (e.g. Dhanmondi, Dhaka)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 transition-colors flex items-start gap-2 text-xs font-semibold text-slate-700 hover:text-red-700"
                    >
                      <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{item.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-slate-200/80" />

          {/* Travel Radius Field */}
          <div>
            <RangeSlider
              label="Travel / Notification Radius"
              value={travelRadius}
              min={1}
              max={50}
              unit=" km"
              marks={[10, 20, 30, 40]}
              onChange={setTravelRadius}
            />
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">
              Urgent blood donation requests within this distance will be ranked highest in your feed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
