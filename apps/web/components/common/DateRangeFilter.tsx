'use client';

import React, { useState } from 'react';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  onClear?: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value = { startDate: '', endDate: '' },
  onChange,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth') => {
    const end = new Date();
    const start = new Date();

    if (preset === 'today') {
      // today
    } else if (preset === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (preset === '7days') {
      start.setDate(start.getDate() - 7);
    } else if (preset === '30days') {
      start.setDate(start.getDate() - 30);
    } else if (preset === 'thisMonth') {
      start.setDate(1);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    onChange({ startDate: startStr, endDate: endStr });
    setIsOpen(false);
  };

  const hasRange = value.startDate || value.endDate;

  return (
    <div className="relative inline-block text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-semibold transition ${
          hasRange
            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
        }`}
      >
        <span>📅</span>
        <span>
          {hasRange
            ? `${value.startDate || '...'} to ${value.endDate || '...'}`
            : 'Filter by Date'}
        </span>
        <span className="text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-30 space-y-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Date Presets
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-slate-300">
            <button
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-left font-medium"
            >
              Today
            </button>
            <button
              onClick={() => applyPreset('yesterday')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-left font-medium"
            >
              Yesterday
            </button>
            <button
              onClick={() => applyPreset('7days')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-left font-medium"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset('30days')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-left font-medium"
            >
              Last 30 Days
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400">Custom Date Range</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={value.startDate}
                  onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-800">
            {hasRange && (
              <button
                onClick={() => {
                  onClear?.();
                  onChange({ startDate: '', endDate: '' });
                  setIsOpen(false);
                }}
                className="text-rose-400 hover:underline font-semibold"
              >
                Clear Filter
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ml-auto px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
