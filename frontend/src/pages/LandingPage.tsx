import React from 'react';
import { Link } from 'react-router-dom';
import { Droplet, Activity, MapPin, HeartHandshake, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 text-slate-100 overflow-x-hidden relative font-sans">
      
      {/* Minimalist Top Nav */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Droplet size={28} className="text-red-500 fill-red-500" />
          <h1 className="font-black text-2xl text-white tracking-tight">BloodPing</h1>
        </div>
        <Link 
          to="/login"
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold py-2 px-6 rounded-full transition-all shadow-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Abstract Visual Elements (Background/Right Side) */}
      <div className="absolute top-0 right-[-10%] md:right-[5%] h-screen flex flex-col justify-center pointer-events-none z-0">
        <div className="relative w-96 h-96 md:w-[600px] md:h-[600px]">
          <div className="absolute inset-0 bg-red-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
          <Droplet 
            className="absolute top-1/4 right-1/4 text-red-500/20 blur-3xl" 
            size={400} 
          />
          <Activity 
            className="absolute bottom-1/4 left-1/4 text-rose-400/20 blur-2xl" 
            size={300} 
          />
        </div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col justify-center min-h-screen px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        
        {/* Floating Stat Card 1 */}
        <div className="hidden md:flex absolute top-1/3 right-[10%] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl items-center gap-3 animate-bounce" style={{ animationDuration: '4s' }}>
          <Zap className="text-yellow-400" size={24} />
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Average match time</p>
            <p className="text-lg font-black text-white">&lt; 3 mins</p>
          </div>
        </div>

        {/* Floating Stat Card 2 */}
        <div className="hidden md:flex absolute bottom-1/3 right-[20%] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl items-center gap-3 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
          <Droplet className="text-red-400 fill-red-400" size={24} />
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Donors</p>
            <p className="text-lg font-black text-white">5,420+</p>
          </div>
        </div>

        <div className="max-w-3xl mt-16 md:mt-0 relative">
          <h2 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-white leading-[1.1] mb-6">
            Pragmatic <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600">
              Urgency.
            </span>
          </h2>
          
          <br />
          <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 leading-relaxed max-w-2xl">
            A modern, real-time blood donation network connecting donors and recipients instantly. Because every drop counts when lives are on the line.
          </p>
          <br />
          <br />
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Link 
              to="/signup"
              className="inline-flex items-center justify-center bg-red-600 hover:bg-red-500 text-white px-8 py-4 text-lg font-bold shadow-lg shadow-red-600/30 hover:scale-105 transition-transform rounded-xl"
            >
              Start Saving Lives
            </Link>
            <button 
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold border border-white/20 hover:bg-white/10 text-white rounded-xl transition-colors cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 px-6 md:px-12 lg:px-24 py-24 max-w-7xl mx-auto border-t border-white/10">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            How it works
          </h2>
          <p className="text-slate-300 text-base md:text-lg max-w-xl text-center">
            Three simple steps to bridge the gap between those in need and those who can help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors shadow-2xl group">
            <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <HeartHandshake className="text-rose-400" size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">1. Register</h4>
            <p className="text-slate-400 leading-relaxed">
              Create a dual-sided donor/recipient profile. Maintain your health vitals and medical clearance in a secure, unified dashboard.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors shadow-2xl group">
            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-red-400" size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">2. Ping</h4>
            <p className="text-slate-400 leading-relaxed">
              Request blood instantly based on your precise geolocation and urgency level. Critical requests jump to the top of the feed.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors shadow-2xl group">
            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="text-orange-400" size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">3. Connect</h4>
            <p className="text-slate-400 leading-relaxed">
              Match instantly with nearby available donors within your designated radius. Save lives directly without middlemen.
            </p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
