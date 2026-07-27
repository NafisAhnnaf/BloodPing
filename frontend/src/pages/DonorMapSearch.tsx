import React, { useState } from 'react';
import { 
  Bell, Search, Crosshair, Home, History, User, Settings2, ShieldCheck
} from 'lucide-react';
import { BottomNav } from '../components/layout/BottomNav';
import { Header } from '../components/layout/Header';

export function DonorMapSearch() {
  const [radius, setRadius] = useState(5);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const donors = [
    {
      id: 1,
      name: "Dr. Sarah Miller",
      role: "General Physician",
      distance: 0.4,
      bloodGroup: "O+",
      verified: true,
      status: "Available Now",
      statusColor: "text-green-600",
      statusDot: "bg-green-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2nG9m9N4YS51eQpO-iOo81pmspMpR28xtdfKHcSJDrzXJEGqV7rwhG60-L_ULAnp6GW84ptsT6gTvgYxcB3cv4CJDtnktaM3TM0zPp7VCzr7OAcUwfnN7b9rFRUhI5eBN1u63y3XdZvfCYvhVlQJqQVoqa9EJvmqZhJKDNHBr7C5Qo2_PwHIlqmrYlFxACNAPmSzV16ZJ_PlGhEHaJkP8NtTtU95Eq0H3nwHF_GI0vLuX9CQJEcffqHhonwpNb5EB0L-7TpC-q5s",
      canMatch: true
    },
    {
      id: 2,
      name: "Marcus Chen",
      role: "Volunteer Donor",
      distance: 1.8,
      bloodGroup: "A-",
      verified: false,
      status: "Last seen 2h ago",
      statusColor: "text-amber-600",
      statusDot: "bg-amber-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCzbkiHuL16wYoXPPQwiufNJKhXFQojhzygonzA6wLl6ziYJnvl-eCB_WImgmN9ByqSsJiIwGLl7ZOldsbxlkH56nd6YClpSutQs1L_LhJmy1qmE1k8Me66670_lFIOGPjB8W-MHmhpVzuMu-Z0RBEGmCo8cfPLYQyMsr6Ee0QK0LmUtdwGKbLkAnQy_RsGV6b3NJXs7udUiA4JKYUWQirkSf9uMB1YJMlw2YNBS0fLUNdaDY-Ck8mGvafu6CUJOvt9j0J08wiuYrs",
      canMatch: true
    },
    {
      id: 3,
      name: "Elena Rodriguez",
      role: "Regular Donor",
      distance: 3.1,
      bloodGroup: "B+",
      verified: false,
      status: "Resting (12 days)",
      statusColor: "text-red-900/50",
      statusDot: "animate-spin border-t-red-700",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrNuDMQevgUlo5z0RrzvJJU3VgPYsbnmPbns91CjAa4hZpUAekSdpTBi8iCPzuCgp_pjEUfmUrKaias1diCx6-5iwiD45s98wo7BuQ9v9GDX6IB52wnOEFCfldGopp6r1A1M2vmAjvNOXa9gQY3M0QFRf8wOpEev6eyD5utYPUblyRVcKVVaf13BFQhuQEeMSsglWvFSAG_hOXCOK4P8Y4LaF1MJ5xtVfRXj_ivw1zXPjWcD9k1C6ywhb5oMN_A4ypCilQkai5Viw",
      canMatch: false,
      isResting: true
    },
    {
      id: 4,
      name: "Samuel Park",
      role: "Verified Donor",
      distance: 4.5,
      bloodGroup: "AB-",
      verified: true,
      status: "Online",
      statusColor: "text-green-600",
      statusDot: "bg-green-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqJ0AxeT0iFNCMCXEVOicM41fo4_jeHAK5yM4dCwH9gPdnb7fbDd5U1U3n8atj08_i24WB8mOC1LtjYeH98u3XcirloQzitUkl3AGqXyp01qT9Uh0PqHnJcSO3_j0oWXJsyo-SMTBiQsUYZtc4mkqhM53cinmw29RF560NFP-lO2kF2qFdE9P150iOz9JdID0Bg6whN-_fMJb6b3bovXLeAT-PoUuVw0b6psCdyZddguMe9tRKCf3O4lsw-vGVSrYLyxcshYZ_N1Y",
      canMatch: true
    }
  ];

  return (
    <div className="bg-gradient-to-br from-amber-200 to-red-600 text-red-950 font-sans h-screen flex flex-col overflow-hidden">
      {/* TopAppBar */}
      <Header />

      {/* Main Canvas: Map View & Sidebar */}
      <main className="relative flex-grow w-full flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        
        {/* Map Area */}
        <div className="relative flex-grow w-full h-full">
          {/* Map Image/Background */}
          <div className="absolute inset-0 z-0 bg-white/20">
            <div 
              className="w-full h-full mix-blend-multiply opacity-80" 
              style={{ 
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJNZNq9sE3JoIwyigxvQKnJSWvIf7tZ8V_UQrV0rmtUOaA_31N2Pk4xSUc-pM_zOLzzDh0-BN3UgMfWcJFpXljxFLJwSeFtcHBunkMTBwVzsuMb2H4J2cEKbjF0sIeBwtRJRYBUxV1taJskAbiOosa_l4CbvvHjrgqtT08g20NjWL1_mZNnM4MnPTNAiv_2cig72Rg1a4tlOqmLXDcALXMniaLjoEW0Qe1B1NPT4kPiXHCuA6qQBee4_Be9FiaIC70CpM-oRREUo8')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'grayscale(0.5) contrast(1.2)'
              }}
            ></div>
            
            {/* Custom Markers */}
            <div className="absolute top-[30%] left-[40%] cursor-pointer group">
              <div className="w-5 h-5 bg-red-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"></div>
              <div className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-white/50 rounded-xl p-2 min-w-[120px] z-10 text-center">
                <p className="text-sm font-bold text-red-900">Dr. Sarah (O+)</p>
                <p className="text-[10px] font-semibold text-red-900/60">0.4 km away</p>
              </div>
            </div>
            
            <div className="absolute top-[50%] left-[60%] cursor-pointer group">
              <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
              <div className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-white/50 rounded-xl p-2 min-w-[120px] z-10 text-center">
                <p className="text-sm font-bold text-blue-900">James T. (A-)</p>
                <p className="text-[10px] font-semibold text-blue-900/60">1.2 km away</p>
              </div>
            </div>
          </div>

          {/* Floating Controls */}
          <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-80 flex flex-col gap-4 z-10">
            {/* Search Input */}
            <div className="bg-white/70 backdrop-blur-xl shadow-lg rounded-2xl border border-white/50 flex items-center px-4 py-3">
              <Search size={20} className="text-red-900/60 mr-3" />
              <input 
                className="bg-transparent border-none focus:ring-0 w-full text-sm font-bold placeholder:text-red-900/50 outline-none text-red-950" 
                placeholder="Search location or blood group..." 
                type="text" 
              />
            </div>

            {/* Radius Slider */}
            <div className="bg-white/70 backdrop-blur-xl shadow-lg rounded-2xl border border-white/50 p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-extrabold text-red-900/70 uppercase tracking-wider">Search Radius</span>
                <span className="text-lg font-black text-red-700">{radius} km</span>
              </div>
              <input 
                className="w-full h-2 bg-red-900/10 rounded-lg appearance-none cursor-pointer accent-red-600" 
                max="50" min="1" type="range" 
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
              <div className="flex justify-between mt-3 text-[10px] font-bold text-red-900/50">
                <span>1 KM</span>
                <span>50 KM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar / Mobile Bottom Sheet */}
        <aside 
          className={`absolute inset-x-0 bottom-0 md:relative md:inset-auto transition-transform duration-300 ease-in-out md:translate-y-0 md:w-[420px] bg-white/70 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-white/40 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 flex flex-col max-h-[80vh] md:max-h-full rounded-t-3xl md:rounded-none
            ${isSheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}
          `}
        >
          {/* Drag Handle (Mobile) */}
          <div 
            className="md:hidden flex justify-center pt-4 pb-2 cursor-pointer w-full" 
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className="w-12 h-1.5 bg-red-900/20 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div onClick={() => setIsSheetExpanded(true)} className="md:cursor-default">
              <h2 className="text-xl font-bold text-red-950">Nearby Donors</h2>
              <p className="text-sm font-semibold text-red-900/60">24 active matches found</p>
            </div>
            <button className="bg-white/50 hover:bg-white/80 transition-colors p-2.5 rounded-xl border border-white/40 shadow-sm">
              <Settings2 size={20} className="text-red-900/70" />
            </button>
          </div>

          {/* Scrollable List */}
          <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-4 scrollbar-hide">
            {donors.map(donor => (
              <div 
                key={donor.id} 
                className={`bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-4 flex gap-4 items-start hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1
                  ${donor.isResting ? 'opacity-70 grayscale-[0.3]' : ''}
                `}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    <img className="w-full h-full object-cover" src={donor.avatar} alt={donor.name} />
                  </div>
                  {donor.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white shadow-sm">
                       <ShieldCheck size={14} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-red-950">{donor.name}</h3>
                      <p className="text-[11px] font-bold text-red-900/60 mt-0.5">{donor.role} • {donor.distance} km</p>
                    </div>
                    <div className="bg-white/80 border border-white text-red-700 px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm">
                      {donor.bloodGroup}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {donor.isResting ? (
                        <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] border-red-900/20 ${donor.statusDot}`}></div>
                      ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${donor.statusDot} shadow-sm`}></div>
                      )}
                      <span className={`text-[11px] font-bold ${donor.statusColor}`}>{donor.status}</span>
                    </div>
                    {donor.canMatch ? (
                      <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95">
                        Match
                      </button>
                    ) : (
                      <button className="bg-white/50 text-red-900/40 px-5 py-1.5 rounded-xl text-xs font-bold cursor-not-allowed border border-red-900/10">
                        Wait
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
