'use client';

import React from 'react';
import Link from 'next/link';
import { usePermissions } from '../../hooks/usePermissions';

export interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
  onSignOut?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileSidebar,
  onSignOut,
}) => {
  const { currentUser, role } = usePermissions();

  return (
    <header className="bg-slate-950/80 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Open mobile menu"
          >
            ☰
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Super Admin Control Panel</span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Logged in as: <strong className="text-indigo-400">{currentUser?.email || 'dnpatel2002@gmail.com'}</strong>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition items-center gap-1.5"
        >
          🌐 View Live Platform
        </Link>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
};
