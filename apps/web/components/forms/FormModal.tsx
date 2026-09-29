'use client';

import React from 'react';

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'lg',
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`glass-card w-full ${maxWidthClasses[maxWidth]} p-6 md:p-8 rounded-3xl border border-indigo-500/30 relative space-y-6 my-8 animate-scale-in max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
