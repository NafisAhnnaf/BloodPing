import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  disablePast?: boolean;
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Select Date",
  minDate,
  disablePast = true
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const effectiveMinDate = minDate !== undefined ? minDate : (disablePast ? todayStr : undefined);

  const initialDate = value ? new Date(value + 'T12:00:00Z') : (effectiveMinDate ? new Date(effectiveMinDate + 'T12:00:00Z') : new Date());
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00Z');
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownStyles({
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`,
        width: '280px'
      });
    }
  }, [isOpen]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const isPrevMonthDisabled = Boolean(
    effectiveMinDate && (
      year < now.getFullYear() || 
      (year === now.getFullYear() && month <= now.getMonth())
    )
  );

  const prevMonth = () => {
    if (isPrevMonthDisabled) return;
    setViewDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isMatched = value === currentDateStr;
    const isToday = todayStr === currentDateStr;
    const isPast = Boolean(effectiveMinDate && currentDateStr < effectiveMinDate);

    days.push(
      <button
        key={d}
        type="button"
        disabled={isPast}
        onClick={() => {
          if (isPast) return;
          onChange(currentDateStr);
          setIsOpen(false);
        }}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
          isMatched 
            ? 'bg-red-600 text-white shadow-md font-bold' 
            : isPast
              ? 'text-slate-300 opacity-30 cursor-not-allowed line-through hover:bg-transparent pointer-events-none'
              : isToday 
                ? 'text-red-600 bg-red-50 hover:bg-red-100 font-bold border border-red-200'
                : 'text-slate-700 hover:bg-slate-100'
        }`}
        title={isPast ? "Past dates cannot be selected" : isToday ? "Today" : undefined}
      >
        {d}
      </button>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const displayDate = value ? new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
      >
        <CalendarIcon size={18} className="text-slate-400 mr-2.5 flex-shrink-0" />
        <span className={value ? "text-slate-800" : "text-slate-400 font-medium"}>{displayDate}</span>
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={dropdownStyles}
          className="z-[99999] bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button" 
              onClick={prevMonth} 
              disabled={isPrevMonthDisabled}
              className={`p-1.5 rounded-full transition-colors ${
                isPrevMonthDisabled 
                  ? 'text-slate-300 opacity-30 cursor-not-allowed' 
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
              title={isPrevMonthDisabled ? "Cannot navigate to past months" : "Previous month"}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-extrabold text-slate-800 text-sm">
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="font-extrabold text-red-600 hover:text-red-700 transition-colors"
            >
              Select Today
            </button>
            <span className="text-[10px] font-semibold text-slate-400">
              Today or future dates only
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
