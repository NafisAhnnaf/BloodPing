import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  marks?: number[];
  onChange: (val: number) => void;
}

export function RangeSlider({ label, value, min, max, unit = '', marks = [], onChange }: RangeSliderProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-3">
        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase text-left">{label}</label>
        <span className="text-sm font-black text-red-600">
          Up to {value}{unit}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-red-600 h-2 bg-slate-200/50 rounded-lg appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-red-500/30"
      />
      <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
        <span>{min}{unit}</span>
        {marks.map((mark) => (
          <span key={mark}>{mark}{unit}</span>
        ))}
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
