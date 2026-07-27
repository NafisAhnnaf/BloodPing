import React from 'react';

interface Option {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
}

export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase text-left mb-3">{label}</label>
      <div className="flex bg-slate-200/60 rounded-xl p-1 shadow-inner border border-slate-300/30">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-300 ${
                isActive 
                  ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-900/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
