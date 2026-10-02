'use client';

import React, { useState } from 'react';
import {
  useGetApiRouteFlagsQuery,
  useUpdateApiRouteFlagMutation,
  useSetUserApiOverrideMutation,
  useGetAdminUsersQuery,
} from '../../../lib/redux/api/adminApi';

export function AdminApiRouteFlagsPanel() {
  const { data: routesRes, isLoading, refetch } = useGetApiRouteFlagsQuery();
  const routes = routesRes?.routes || [];

  const [updateRouteFlag] = useUpdateApiRouteFlagMutation();
  const [setUserApiOverride] = useSetUserApiOverrideMutation();

  const [activeTab, setActiveTab] = useState<'ROUTE_FLAGS' | 'USER_API_OVERRIDES'>('ROUTE_FLAGS');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRoute, setEditingRoute] = useState<any | null>(null);

  // User Overrides State
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const { data: usersData } = useGetAdminUsersQuery({ page: 1, limit: 10, search: searchUserQuery });
  const users = usersData?.users || usersData?.data || [];
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [overrideForm, setOverrideForm] = useState({
    routePath: '',
    method: 'ALL',
    isEnabled: true,
  });

  const filteredRoutes = routes.filter((r: any) => {
    const matchesModule = moduleFilter === 'ALL' || r.module === moduleFilter;
    const matchesSearch =
      !searchQuery ||
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.path?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  const handleToggleRoute = async (route: any, field: 'isEnabled' | 'isRateLimitEnabled' | 'webEnabled' | 'mobileEnabled') => {
    try {
      await updateRouteFlag({
        path: route.path,
        [field]: !route[field],
      }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update route flag');
    }
  };

  const handleSaveRouteEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    try {
      await updateRouteFlag({
        path: editingRoute.path,
        isEnabled: editingRoute.isEnabled,
        isRateLimitEnabled: editingRoute.isRateLimitEnabled,
        rateLimitPerMin: Number(editingRoute.rateLimitPerMin),
        webEnabled: editingRoute.webEnabled,
        mobileEnabled: editingRoute.mobileEnabled,
      }).unwrap();
      setEditingRoute(null);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update route configuration');
    }
  };

  const handleSetUserApiOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !overrideForm.routePath) return;
    try {
      await setUserApiOverride({
        userId: selectedUser.id,
        routePath: overrideForm.routePath,
        method: overrideForm.method,
        isEnabled: overrideForm.isEnabled,
      }).unwrap();
      alert(`API route override saved for ${selectedUser.fullName || selectedUser.email}`);
      setOverrideForm({ routePath: '', method: 'ALL', isEnabled: true });
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save user API override');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🌐 API Route Feature Flags & Rate Limits</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamically enable/disable API endpoints, configure rate-limiting & user-specific route overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ROUTE_FLAGS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ROUTE_FLAGS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Route Flags
            </button>
            <button
              onClick={() => setActiveTab('USER_API_OVERRIDES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'USER_API_OVERRIDES'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              User API Overrides
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ROUTE_FLAGS' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-500">Module:</span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="USER">USER</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="CHAT">CHAT</option>
                <option value="GROUPS">GROUPS</option>
                <option value="CALLS">CALLS</option>
                <option value="STORAGE">STORAGE</option>
                <option value="POSTS">POSTS</option>
                <option value="PRODUCTS">PRODUCTS</option>
                <option value="LEADS">LEADS</option>
                <option value="PAYMENTS">PAYMENTS</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search route by name or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Routes Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-500">
                    <th className="p-3 pl-4">API Route & Endpoint</th>
                    <th className="p-3">Module</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Rate Limit Flag</th>
                    <th className="p-3 text-center">Limit/min</th>
                    <th className="p-3 text-center">Platforms</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Loading API route feature flags...
                      </td>
                    </tr>
                  ) : filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No registered API routes match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="p-3 pl-4">
                          <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                          <p className="text-[10px] font-mono text-indigo-500">
                            <span className="font-bold uppercase text-slate-400 mr-1">[{r.method}]</span>
                            {r.path}
                          </p>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold rounded text-[10px]">
                            {r.module}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleRoute(r, 'isEnabled')}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition border ${
                              r.isEnabled
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900'
                            }`}
                          >
                            {r.isEnabled ? '🟢 ON' : '🔴 OFF'}
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleRoute(r, 'isRateLimitEnabled')}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition border ${
                              r.isRateLimitEnabled
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {r.isRateLimitEnabled ? '⚡ ENFORCED' : '⚪ OFF'}
                          </button>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {r.isRateLimitEnabled ? `${r.rateLimitPerMin}/min` : 'Unlimited'}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleToggleRoute(r, 'webEnabled')}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                r.webEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-400 line-through'
                              }`}
                            >
                              WEB
                            </button>
                            <button
                              onClick={() => handleToggleRoute(r, 'mobileEnabled')}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                r.mobileEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-400 line-through'
                              }`}
                            >
                              MOBILE
                            </button>
                          </div>
                        </td>

                        <td className="p-3 text-right pr-4">
                          <button
                            onClick={() => setEditingRoute(r)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-[10px]"
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* USER API OVERRIDES TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Select Target User</h3>
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
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
              2. Assign API Route Override {selectedUser ? `for ${selectedUser.fullName || selectedUser.email}` : ''}
            </h3>

            {!selectedUser ? (
              <p className="text-xs text-slate-500 py-8 text-center">Select a user on the left to override API endpoint access.</p>
            ) : (
              <form onSubmit={handleSetUserApiOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Target API Endpoint
                  </label>
                  <select
                    value={overrideForm.routePath}
                    onChange={(e) => setOverrideForm({ ...overrideForm, routePath: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                    required
                  >
                    <option value="">-- Choose API Route --</option>
                    {routes.map((r: any) => (
                      <option key={r.id} value={r.path}>
                        [{r.method}] {r.path} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Access Decision:</label>
                  <label className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isEnabled"
                      checked={overrideForm.isEnabled === true}
                      onChange={() => setOverrideForm({ ...overrideForm, isEnabled: true })}
                    />
                    Explicit ENABLE
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-600 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isEnabled"
                      checked={overrideForm.isEnabled === false}
                      onChange={() => setOverrideForm({ ...overrideForm, isEnabled: false })}
                    />
                    Explicit DISABLE
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Save API Route Override
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {editingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Configure API Route: {editingRoute.name}</h3>
            <form onSubmit={handleSaveRouteEdit} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">API Route Status</span>
                <input
                  type="checkbox"
                  checked={editingRoute.isEnabled}
                  onChange={(e) => setEditingRoute({ ...editingRoute, isEnabled: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Rate Limiting Flag</span>
                <input
                  type="checkbox"
                  checked={editingRoute.isRateLimitEnabled}
                  onChange={(e) => setEditingRoute({ ...editingRoute, isRateLimitEnabled: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
              </div>

              {editingRoute.isRateLimitEnabled && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rate Limit (Requests / Minute)
                  </label>
                  <input
                    type="number"
                    value={editingRoute.rateLimitPerMin}
                    onChange={(e) => setEditingRoute({ ...editingRoute, rateLimitPerMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRoute.webEnabled}
                    onChange={(e) => setEditingRoute({ ...editingRoute, webEnabled: e.target.checked })}
                  />
                  Web Enabled
                </label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRoute.mobileEnabled}
                    onChange={(e) => setEditingRoute({ ...editingRoute, mobileEnabled: e.target.checked })}
                  />
                  Mobile Enabled
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
