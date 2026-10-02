'use client';

import React, { useState } from 'react';
import {
  useGetPlatformLimitsQuery,
  useUpdatePlatformLimitMutation,
  useSetUserLimitOverrideMutation,
  useGetAdminUsersQuery,
} from '../../../lib/redux/api/adminApi';

export function AdminPlatformLimitsPanel() {
  const { data: limitsRes, isLoading: limitsLoading, refetch: refetchLimits } = useGetPlatformLimitsQuery();
  const limits = limitsRes?.limits || [];

  const [updateLimit] = useUpdatePlatformLimitMutation();
  const [setUserLimitOverride] = useSetUserLimitOverrideMutation();

  const [activeTab, setActiveTab] = useState<'GLOBAL_LIMITS' | 'USER_LIMIT_OVERRIDES'>('GLOBAL_LIMITS');
  const [editingLimit, setEditingLimit] = useState<any | null>(null);

  // User Limit Override state
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const { data: usersData } = useGetAdminUsersQuery({ page: 1, limit: 10, search: searchUserQuery });
  const users = usersData?.users || usersData?.data || [];
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [overrideForm, setOverrideForm] = useState({
    limitKey: '',
    value: 10,
  });

  const handleUpdateLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLimit) return;
    try {
      await updateLimit({
        limitKey: editingLimit.key,
        defaultValue: Number(editingLimit.defaultValue || editingLimit.maxValue),
      }).unwrap();
      setEditingLimit(null);
      refetchLimits();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update limit');
    }
  };

  const handleSetUserLimitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !overrideForm.limitKey) return;
    try {
      await setUserLimitOverride({
        userId: selectedUser.id,
        limitKey: overrideForm.limitKey,
        value: Number(overrideForm.value),
      }).unwrap();
      alert(`Custom limit override applied for ${selectedUser.fullName || selectedUser.email}`);
      setOverrideForm({ limitKey: '', value: 10 });
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to set user limit override');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊 Dynamic Limits & Capacity Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure system capacity, rate limits, storage thresholds & user specific quota overrides.
          </p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-semibold">
          <button
            onClick={() => setActiveTab('GLOBAL_LIMITS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'GLOBAL_LIMITS'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Global Limits
          </button>
          <button
            onClick={() => setActiveTab('USER_LIMIT_OVERRIDES')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'USER_LIMIT_OVERRIDES'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            User Quota Overrides
          </button>
        </div>
      </div>

      {activeTab === 'GLOBAL_LIMITS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {limits.map((l: any) => (
            <div
              key={l.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                    {l.period || 'LIFETIME'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{l.unit || 'COUNT'}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{l.name}</h4>
                <p className="text-[11px] font-mono text-indigo-500 mt-0.5">{l.key}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {l.description || 'System resource threshold limit.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Max Limit:</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white ml-2">
                    {l.defaultValue ?? l.maxValue}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {l.unit === 'BYTES' ? 'Bytes' : l.unit === 'SECONDS' ? 'sec' : ''}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => setEditingLimit(l)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* USER QUOTA OVERRIDES TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Select Target User</h3>
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedUser?.id === u.id
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-bold'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">{u.fullName || 'Unnamed User'}</p>
                  <p className="text-[10px] text-slate-400">{u.email}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Assign Custom Limit Quota {selectedUser ? `for ${selectedUser.fullName || selectedUser.email}` : ''}
            </h3>

            {!selectedUser ? (
              <p className="text-xs text-slate-500 py-8 text-center">Select a user on the left to override resource limits.</p>
            ) : (
              <form onSubmit={handleSetUserLimitOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Target Resource Limit
                  </label>
                  <select
                    value={overrideForm.limitKey}
                    onChange={(e) => setOverrideForm({ ...overrideForm, limitKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Limit --</option>
                    {limits.map((l: any) => (
                      <option key={l.id} value={l.key}>
                        {l.name} ({l.key}) - Default: {l.defaultValue ?? l.maxValue}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Custom Max Value
                  </label>
                  <input
                    type="number"
                    value={overrideForm.value}
                    onChange={(e) => setOverrideForm({ ...overrideForm, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Save Quota Override
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Limit Modal */}
      {editingLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Platform Limit: {editingLimit.name}</h3>
            <form onSubmit={handleUpdateLimitSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Default Max Value</label>
                <input
                  type="number"
                  value={editingLimit.defaultValue ?? editingLimit.maxValue}
                  onChange={(e) =>
                    setEditingLimit({ ...editingLimit, defaultValue: Number(e.target.value), maxValue: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLimit(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Update Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
