import React, { useState, useEffect } from 'react';
import { 
  User, Activity, Droplets, Calendar, UploadCloud, 
  Settings, LogOut, ChevronRight, ShieldCheck, History
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { supabase } from '../services/supabaseClient';
import { SessionAuditModal } from '../components/profile/SessionAuditModal';
import { PreferencesModal } from '../components/profile/PreferencesModal';
import { MedicalDocumentsModal } from '../components/profile/MedicalDocumentsModal';
import { PrivacyAvailabilityModal } from '../components/profile/PrivacyAvailabilityModal';

export function DonorProfileStats() {
  const { role } = useRole();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const settingsOptions = [
    { id: 'preferences', icon: Settings, title: 'Preferences', subtitle: 'Location, travel radius & alert settings' },
    ...(role === 'donor'
      ? [{ id: 'medical', icon: UploadCloud, title: 'Medical Documents', subtitle: 'View uploaded records & verification' }]
      : []),
    { id: 'security', icon: History, title: 'Login & Session History', subtitle: 'Manage active devices, IP logs & security' },
    { id: 'privacy', icon: ShieldCheck, title: 'Privacy & Availability', subtitle: 'Manage emergency availability, visibility & data' },
    { id: 'logout', icon: LogOut, title: 'Log Out', subtitle: 'Sign out of your account' },
  ];

  const handleOptionClick = async (id: string) => {
    if (id === 'preferences') {
      setIsPreferencesModalOpen(true);
      return;
    }
    if (id === 'medical') {
      setIsMedicalModalOpen(true);
      return;
    }
    if (id === 'security') {
      setIsSessionModalOpen(true);
      return;
    }
    if (id === 'privacy') {
      setIsPrivacyModalOpen(true);
      return;
    }
    if (id === 'logout') {
      try {
        await logout();
      } catch (err) {
        console.error('Failed to log out:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="font-sans">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-32 flex flex-col justify-center items-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">Loading Profile...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <Header />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Hero Profile Section */}
        <section>
          <div className="bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
            <div className="relative z-10 w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden shadow-inner flex-shrink-0 bg-white flex items-center justify-center">
              <User size={48} className="text-red-500 opacity-80" />
            </div>
            
            <div className="relative z-10 flex-1">
              <h2 className="text-3xl font-extrabold mb-1 tracking-tight">
                {user?.full_name || 'No Name'}
              </h2>
              <p className="text-white/80 text-sm font-semibold mb-2">
                @{user?.username || ''} • {user?.email}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  {role}
                </span>
                <span className="px-3 py-1 rounded-full bg-red-800/40 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Blood Group: {user?.blood_group || 'N/A'}
                </span>
                {user?.location_name && (
                  <span className="px-3 py-1 rounded-full bg-orange-800/40 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    📍 {user.location_name}
                  </span>
                )}
              </div>
              {user?.bio && (
                <p className="text-white/90 text-sm italic font-medium max-w-xl">
                  "{user.bio}"
                </p>
              )}
            </div>
             
            {/* Decorative background elements */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-orange-400/30 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-2 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 text-slate-500">
              {role === 'donor' ? <Droplets size={20} className="text-red-500" /> : <Activity size={20} className="text-red-500" />}
              <span className="text-sm font-bold">{role === 'donor' ? 'Total Donations' : 'Total Requests'}</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {role === 'donor' ? (user?.total_donations ?? 0) : (user?.total_requests ?? 0)}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-2 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={20} className="text-orange-500" />
              <span className="text-sm font-bold">{role === 'donor' ? 'Travel Radius' : 'Target Area'}</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {user?.travel_radius_km ? `${user.travel_radius_km} km` : 'N/A'}
            </p>
          </div>
        </section>

        {/* Settings List */}
        <section className="flex flex-col gap-3">
          {settingsOptions.map(option => (
            <div 
              key={option.id} 
              onClick={() => handleOptionClick(option.id)}
              className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-1 hover:bg-white transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  <option.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{option.title}</h3>
                  <p className="text-xs font-semibold text-slate-500">{option.subtitle}</p>
                </div>
              </div>
              <div className="text-slate-400 group-hover:text-red-500 transition-colors">
                <ChevronRight size={20} />
              </div>
            </div>
          ))}
        </section>
      </main>

      <SessionAuditModal 
        isOpen={isSessionModalOpen} 
        onClose={() => setIsSessionModalOpen(false)} 
      />

      <PreferencesModal 
        isOpen={isPreferencesModalOpen} 
        onClose={() => setIsPreferencesModalOpen(false)} 
        user={user}
        onUpdated={fetchProfile}
      />

      <MedicalDocumentsModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
      />

      <PrivacyAvailabilityModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        user={user}
        onUpdated={fetchProfile}
      />
    </div>
  );
}

