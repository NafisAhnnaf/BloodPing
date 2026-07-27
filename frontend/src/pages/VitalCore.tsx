import React from 'react';
import { Palette, Layers, Box, Type, MousePointerClick, Shield } from 'lucide-react';

/**
 * VitalCore Showcase
 * This component visually documents the design system specified in DESIGN.md.
 * It provides a living styleguide representing the "Pragmatic Urgency" 
 * and "Corporate / Modern" aesthetics for developers.
 */
export function VitalCore() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 to-red-600 p-4 md:p-8 text-red-950 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-lg text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-md rotate-3">
              <Shield size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-red-950 tracking-tight mb-2">Vital Core Design System</h1>
              <p className="text-red-900/80 font-medium max-w-2xl text-lg leading-relaxed">
                A design system built on a "Pragmatic Urgency" philosophy. Balances the critical nature of blood donation with the methodical reliability of a medical platform.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Colors */}
          <section className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-red-900/10 pb-4">
              <Palette className="text-red-600" size={24} />
              <h2 className="text-2xl font-bold text-red-950">Core Colors</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-red-600 shadow-md"></div>
                <div>
                  <p className="font-bold text-red-950">Urgent Red (#E63946)</p>
                  <p className="text-xs font-semibold text-red-900/60 mt-1">Primary CTA, alerts, blood supply branding</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-800 shadow-md"></div>
                <div>
                  <p className="font-bold text-red-950">Secondary Navy</p>
                  <p className="text-xs font-semibold text-red-900/60 mt-1">Authority, trust, text grounding</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#F1F4F9] shadow-md border border-white"></div>
                <div>
                  <p className="font-bold text-red-950">Clinical Neutral (#F1F4F9)</p>
                  <p className="text-xs font-semibold text-red-900/60 mt-1">Base background, clean aesthetics</p>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-red-900/10 pb-4">
              <Type className="text-red-600" size={24} />
              <h2 className="text-2xl font-bold text-red-950">Typography (Inter)</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-red-950 tracking-tight leading-tight">Headline LG</h1>
                <p className="text-xs font-mono font-bold text-red-900/50 mt-1">32px / 700 / -0.02em</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-950 leading-snug">Headline MD</h2>
                <p className="text-xs font-mono font-bold text-red-900/50 mt-1">24px / 600</p>
              </div>
              <div>
                <p className="text-base font-medium text-red-950 leading-relaxed">
                  Body MD. This text uses a generous line height for maximum legibility and systematic, utilitarian feel.
                </p>
                <p className="text-xs font-mono font-bold text-red-900/50 mt-1">16px / 400 / 24px LH</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-red-900/70">Label SM</p>
                <p className="text-xs font-mono font-bold text-red-900/50 mt-1">11px / 500 / 0.05em</p>
              </div>
            </div>
          </section>

          {/* Components */}
          <section className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3 mb-6 border-b border-red-900/10 pb-4">
              <Box className="text-red-600" size={24} />
              <h2 className="text-2xl font-bold text-red-950">Core Components</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Buttons */}
              <div className="space-y-4">
                <h3 className="font-bold text-red-900/70 uppercase tracking-widest text-xs mb-4">Buttons</h3>
                <button className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-md hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <MousePointerClick size={18} />
                  Primary Action
                </button>
                <button className="w-full px-6 py-3 bg-white border-2 border-slate-800 text-slate-800 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                  Secondary Navy
                </button>
                <button className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all">
                  Confirm / Success
                </button>
              </div>

              {/* Chips & Badges */}
              <div className="space-y-4">
                <h3 className="font-bold text-red-900/70 uppercase tracking-widest text-xs mb-4">Status Chips</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-extrabold shadow-sm border border-red-200">
                    O- CRITICAL
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-extrabold shadow-sm border border-green-200">
                    AVAILABLE
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-extrabold shadow-sm border border-slate-300">
                    RESTING
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-extrabold shadow-sm border border-amber-200">
                    PENDING
                  </span>
                </div>
                
                <h3 className="font-bold text-red-900/70 uppercase tracking-widest text-xs mt-6 mb-3">Ping Indicator</h3>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-white/50 shadow-sm w-max">
                  <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]"></div>
                  <span className="text-sm font-bold text-red-950">Urgent Request</span>
                </div>
              </div>

              {/* Inputs & Elevation */}
              <div className="space-y-4">
                <h3 className="font-bold text-red-900/70 uppercase tracking-widest text-xs mb-4">Input & Elevation</h3>
                <div>
                  <label className="block text-xs font-bold text-red-900/70 mb-1.5 uppercase tracking-wider">Standard Input</label>
                  <input 
                    type="text" 
                    placeholder="8px rounded, 1px border" 
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:outline-none font-medium text-slate-900 shadow-inner"
                  />
                </div>
                <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_24px_rgba(29,53,87,0.08)]">
                  <p className="text-sm font-bold text-slate-900">Level 2 Surface</p>
                  <p className="text-xs text-slate-500 mt-1">16px rounded, diffused shadow</p>
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
