'use client';

import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
  secondaryActions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-extrabold text-white">{title}</h1>
          {badge && (
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
        )}
      </div>

      {(action || secondaryActions) && (
        <div className="flex items-center gap-3 self-start md:self-auto">
          {secondaryActions}
          {action}
        </div>
      )}
    </div>
  );
};
