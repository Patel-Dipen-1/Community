'use client';

import React, { useState } from 'react';
import { useGetAuditLogsQuery } from '../../../lib/redux/api/adminApi';

export function AdminAuditLogsPanel() {
  const { data: logsRes, isLoading, refetch } = useGetAuditLogsQuery(50);
  const logs = logsRes?.logs || [];

  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<any | null>(null);

  const filteredLogs = logs.filter((log: any) => {
    const matchesAction = !actionFilter || log.action?.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesResource = !resourceFilter || log.resource?.toLowerCase().includes(resourceFilter.toLowerCase());
    return matchesAction && matchesResource;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📜 Super Admin Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable tracking of security actions, feature flag toggles, role updates & admin interventions.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter action (e.g. TOGGLE_FEATURE)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Filter resource..."
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />

          <button
            onClick={() => refetch()}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-500">
                <th className="p-3 pl-4">Timestamp</th>
                <th className="p-3">Admin User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Resource / Target</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-right pr-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit log records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <td className="p-3 pl-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {log.adminUser?.fullName || log.adminUser?.email || log.adminUserId || 'SYSTEM'}
                      </p>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.resource} {log.resourceId ? `(${log.resourceId})` : ''}
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[10px]">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="p-3 text-right pr-4">
                      <button
                        onClick={() => setExpandedLog(expandedLog?.id === log.id ? null : log)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] transition"
                      >
                        {expandedLog?.id === log.id ? 'Hide Details' : 'View Diff'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Diff Drawer/Modal */}
      {expandedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Audit Log State Changes</h3>
              <button onClick={() => setExpandedLog(null)} className="text-slate-400 font-bold text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500">Action:</span>
                <span className="ml-2 font-mono text-indigo-500">{expandedLog.action}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500">Resource:</span>
                <span className="ml-2 font-mono">{expandedLog.resource}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
                  <p className="font-bold text-rose-700 dark:text-rose-400 text-[10px] uppercase mb-1">Old State</p>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-x-auto text-rose-900 dark:text-rose-300">
                    {JSON.stringify(expandedLog.oldValue || {}, null, 2)}
                  </pre>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase mb-1">New State</p>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-x-auto text-emerald-900 dark:text-emerald-300">
                    {JSON.stringify(expandedLog.newValue || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setExpandedLog(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
