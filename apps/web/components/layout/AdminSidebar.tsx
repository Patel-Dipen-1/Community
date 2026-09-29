'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '../../hooks/usePermissions';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: string;
  badge?: number | string;
  permission?: string;
}

export interface AdminSidebarProps {
  activeTab?: string;
  onSelectTab?: (id: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'VERIFICATION', label: 'Inspect Registrations', icon: '📋', permission: 'users.view' },
  { id: 'SESSIONS', label: 'Live Active Sessions', icon: '📡', permission: 'sessions.view' },
  { id: 'USERS', label: 'User CRUD Engine', icon: '👥', permission: 'users.view' },
  { id: 'DELETIONS', label: 'Deletion Requests', icon: '⚠️', permission: 'users.delete' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        {/* Admin Brand Logo Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-indigo-500/30">
            🛡️
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white leading-tight">Super Admin</h2>
            <span className="text-[10px] text-slate-400 font-mono">Control Center v2.5</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 text-xs font-semibold">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main Management
          </div>

          {ADMIN_NAV_ITEMS.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;

            const isActive = activeTab ? activeTab === item.id : pathname === item.href;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (onSelectTab) onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-indigo-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>System Status:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
        <div className="text-[10px] text-slate-500 truncate font-mono">
          Host: postgresql://127.0.0.1:5432
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 p-5 bg-slate-950/90 border-r border-slate-800 min-h-screen shrink-0">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative w-72 p-6 bg-slate-950 border-r border-slate-800 h-full flex flex-col z-10 animate-slide-in">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};
