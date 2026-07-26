import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { SelectDropdown } from './SelectDropdown';
import { Mail, Lock, User, Phone, UploadCloud, MapPin, Search, Droplet } from 'lucide-react';
import { BLOOD_GROUPS } from '../../services/mockData';

export function AuthPage() {
  const { login, signup } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const today = new Date().toISOString().split('T')[0];
  const eighteenYearsAgo = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fourMonthsAgo = new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Login State
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Signup State
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    dateOfBirth: '',
    locationName: '',
    bloodGroup: 'A+',
    travelRadiusKm: 15,
    documentDate: ''
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(loginForm);
    navigate('/feed');
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check age 18+ validation
    if (!signupForm.dateOfBirth) return alert("Date of Birth is required");
    const dob = new Date(signupForm.dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const age = new Date(ageDiff).getUTCFullYear() - 1970;
    
    if (age < 18) {
      alert("You must be at least 18 years old to sign up.");
      return;
    }

    // Check doc freshness (not older than 4 months)
    if (signupForm.documentDate) {
      const docDate = new Date(signupForm.documentDate);
      const diffMonths = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths > 4) {
        alert("Medical document cannot be older than 4 months.");
        return;
      }
    }

    signup(signupForm);
    navigate('/feed');
  };

  const handleGoogleLogin = () => {
    login({ email: 'google_user@demo.com', password: '' }, true);
    navigate('/feed');
  };

  const handleDemoLogin = () => {
    login({ email: 'donor@bloodping.com', password: 'password123' }, true);
    navigate('/feed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col justify-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Droplet size={32} className="text-red-500 fill-red-500 animate-pulse" />
          <h2 className="text-3xl font-black text-white tracking-tight">
            BloodPing
          </h2>
        </div>
        <p className="text-sm text-rose-200 font-medium">
          {isLogin ? "Sign in to your account to save lives" : "Create an account to start donating"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-rose-950/50 rounded-3xl p-8 w-full">
          
          {isLogin ? (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email or Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="donor@bloodping.com"
                    className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="password123"
                    className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  ⚡ One-Click Demo Login
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="text-center mt-6">
                <span className="text-sm text-slate-500 font-medium">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => navigate('/signup')} className="text-red-600 font-extrabold hover:underline">
                    Sign Up
                  </button>
                </span>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignupSubmit}>
              <h3 className="text-lg font-black text-slate-900 border-b pb-2 mb-4">Basic Profile</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text" required
                    value={signupForm.fullName}
                    onChange={e => setSignupForm({...signupForm, fullName: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username</label>
                <input
                  type="text" required
                  value={signupForm.username}
                  onChange={e => setSignupForm({...signupForm, username: e.target.value})}
                  className="block w-full px-4 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel" required
                    value={signupForm.phone}
                    onChange={e => setSignupForm({...signupForm, phone: e.target.value.replace(/[^0-9+\-\s]/g, '')})}
                    className="block w-full pl-10 pr-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input 
                    type="date"
                    required
                    max={eighteenYearsAgo}
                    value={signupForm.dateOfBirth}
                    onChange={e => setSignupForm({...signupForm, dateOfBirth: e.target.value})}
                    onClick={e => e.currentTarget.showPicker()}
                    className="block w-full px-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Must be 18+</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Location</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text" required
                      value={signupForm.locationName}
                      onChange={e => setSignupForm({...signupForm, locationName: e.target.value})}
                      placeholder="City, Country"
                      className="block w-full pl-8 pr-2 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 border-b pb-2 mb-4 mt-6">Donor Profile</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
                  <SelectDropdown 
                    value={signupForm.bloodGroup}
                    onChange={v => setSignupForm({...signupForm, bloodGroup: v})}
                    options={BLOOD_GROUPS.filter(g => g !== 'All').map(g => ({ label: g, value: g }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Travel Radius <span className="text-red-600">({signupForm.travelRadiusKm} KM)</span>
                  </label>
                  <input 
                    type="range" min="1" max="50" 
                    value={signupForm.travelRadiusKm}
                    onChange={e => setSignupForm({...signupForm, travelRadiusKm: parseInt(e.target.value)})}
                    className="w-full accent-red-600 mt-2"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-600">Upload Medical Clearance (Optional)</p>
                <p className="text-[10px] text-slate-400 mt-1">Drag and drop PDF/Image here</p>
                
                <div className="mt-4 text-left">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Document Issue Date</label>
                  <input 
                    type="date"
                    min={fourMonthsAgo}
                    max={today}
                    value={signupForm.documentDate}
                    onChange={e => setSignupForm({...signupForm, documentDate: e.target.value})}
                    onClick={e => e.currentTarget.showPicker()}
                    className="block w-full px-3 py-3 border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 bg-white/90 text-slate-900 rounded-xl font-semibold placeholder:text-slate-400 shadow-sm transition-all outline-none cursor-pointer"
                  />
                  <p className="text-[10px] text-amber-600 font-bold mt-1">Warning: Document cannot be older than 4 months.</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Create Account
                </button>
                <div className="text-center mt-2">
                  <span className="text-sm text-slate-500 font-medium">
                    Already have an account?{" "}
                    <button type="button" onClick={() => navigate('/login')} className="text-slate-900 font-extrabold hover:underline">
                      Sign In
                    </button>
                  </span>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
      </div>
    </div>
  );
}
