import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', bordered = true }) => {
  return (
    <div
      className={`glass-card p-6 rounded-3xl ${
        bordered ? 'border border-indigo-500/30' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
