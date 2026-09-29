'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface CommonSearchProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export const CommonSearch: React.FC<CommonSearchProps> = ({
  placeholder = 'Search by keywords...',
  value: externalValue = '',
  onChange,
  debounceMs = 300,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(externalValue);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      onChange(internalValue);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={`relative flex items-center min-w-[240px] ${className}`}>
      <span className="absolute left-3.5 text-slate-500 text-xs">🔍</span>
      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
      />
      {isSearching && (
        <span className="absolute right-3 text-xs text-indigo-400 animate-spin">⏳</span>
      )}
      {!isSearching && internalValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-slate-400 hover:text-white text-xs font-bold"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};
