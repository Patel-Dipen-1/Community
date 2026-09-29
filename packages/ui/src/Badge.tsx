import React from 'react';

export interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'info', children, className = '' }) => {
  const variantStyles = {
    info: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
