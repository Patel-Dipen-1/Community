'use client';

import React from 'react';
import Link from 'next/link';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading data...',
}) => (
  <div className="py-16 text-center text-slate-400 text-xs font-semibold animate-pulse flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    <span>⏳ {message}</span>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}> = ({
  title = 'No records found',
  description = 'There are no items matching your criteria.',
  icon = '📂',
  action,
}) => (
  <div className="glass-card p-12 text-center text-slate-400 rounded-3xl border-slate-800 my-4">
    <div className="text-4xl mb-3">{icon}</div>
    <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
    <p className="text-xs max-w-md mx-auto mb-4">{description}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) => (
  <div className="glass-card p-8 text-center rounded-3xl border-rose-500/30 bg-rose-500/5 my-4">
    <div className="text-3xl mb-2 text-rose-400">⚠️</div>
    <h3 className="text-base font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
      >
        🔄 Retry Request
      </button>
    )}
  </div>
);

export const PermissionDeniedState: React.FC<{
  requiredPermission?: string;
}> = ({ requiredPermission }) => (
  <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
    <div className="glass-card max-w-md w-full p-8 rounded-3xl border-rose-500/40 shadow-2xl">
      <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-500/30">
        🔒
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        You do not have permission to access this module.
        {requiredPermission && (
          <span className="block mt-2 font-mono text-rose-400">
            Required Permission: {requiredPermission}
          </span>
        )}
      </p>
      <Link
        href="/admin"
        className="inline-block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-xl transition"
      >
        Return to Dashboard ➔
      </Link>
    </div>
  </div>
);
