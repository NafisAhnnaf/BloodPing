import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SelectDropdown } from '../components/ui/SelectDropdown';
import { User, Phone, MapPin, Droplet, Calendar, Mail } from 'lucide-react';
import { BLOOD_GROUPS } from '../services/mockData';
import apiClient from '../services/apiClient';

export function SetupProfilePage() {
  const { session, checkProfilePresence } = useAuth();
  const navigate = useNavigate();

  const userMetadata = session?.user?.user_metadata || {};
  const userEmail = session?.user?.email || '';

  // Simple, lightweight slugify helper (zero-dependency)
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces/hyphens
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores/hyphens with a single hyphen
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
  };

  const initialFullName = userMetadata.full_name || '';
  const initialUsername = slugify(initialFullName || userEmail.split('@')[0] || '');

  const [form, setForm] = useState({
    fullName: initialFullName,
    username: initialUsername,
    phone: session?.user?.phone || '',
    dateOfBirth: '',
    locationName: '',
    bloodGroup: 'A+',
    travelRadiusKm: 15,
    bio: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username) return alert('Username is required');
    if (!form.dateOfBirth) return alert('Date of birth is required');

    // 18+ validation
    const dob = new Date(form.dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const age = new Date(ageDiff).getUTCFullYear() - 1970;
    if (age < 18) {
      alert("You must be at least 18 years old to complete registration.");
      return;
    }

    setSubmitting(true);
    try {
      // Mock latitude and longitude for geolocation center coordinates
      const mockLatitude = 23.8103 + (Math.random() - 0.5) * 0.1;
      const mockLongitude = 90.4125 + (Math.random() - 0.5) * 0.1;

      await apiClient.post('/users/', {
        username: form.username,
        email: userEmail,
        full_name: form.fullName,
        date_of_birth: form.dateOfBirth,
        phone: form.phone,
        bio: form.bio,
        blood_group: form.bloodGroup,
        travel_radius_km: form.travelRadiusKm,
        location_name: form.locationName || 'Dhaka, BD',
        latitude: mockLatitude,
        longitude: mockLongitude
      });

      // Update hasProfile status in AuthContext to lift the routing redirect barrier
      if (session?.user?.id) {
        await checkProfilePresence(session.user.id);
      }
      navigate('/feed');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to complete profile setup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col justify-center">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Droplet size={32} className="text-red-500 fill-red-500 animate-pulse" />
            <h2 className="text-3xl font-black text-white tracking-tight">
              Complete Profile
            </h2>
          </div>
          <p className="text-sm text-rose-200 font-medium">
            Welcome to BloodPing! Please complete your details to start saving lives.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-rose-950/50 rounded-3xl p-8 w-full">
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-200 bg-slate-100 text-slate-500 rounded-xl font-semibold shadow-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text" required
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={e => setForm({...form, fullName: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Choose Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold text-sm">@</span>
                </div>
                <input
                  type="text" required
                  placeholder="johndoe"
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="tel" required
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="date" required
                  value={form.dateOfBirth}
                  onChange={e => setForm({...form, dateOfBirth: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold text-slate-800 shadow-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text" required
                  placeholder="Dhaka, BD"
                  value={form.locationName}
                  onChange={e => setForm({...form, locationName: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
                <SelectDropdown
                  options={BLOOD_GROUPS}
                  value={form.bloodGroup}
                  onChange={val => setForm({...form, bloodGroup: val})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Travel Radius</label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="range" min="5" max="100" step="5"
                    value={form.travelRadiusKm}
                    onChange={e => setForm({...form, travelRadiusKm: Number(e.target.value)})}
                    className="w-full accent-red-600"
                  />
                  <span className="text-xs font-extrabold text-slate-700 w-12 text-right">{form.travelRadiusKm}km</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Short Bio</label>
              <textarea
                placeholder="Share a bit about yourself..."
                value={form.bio}
                onChange={e => setForm({...form, bio: e.target.value})}
                rows={2}
                className="block w-full px-3 py-2 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 mt-6"
            >
              {submitting ? 'Setting up account...' : 'Complete Registration 🩸'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
