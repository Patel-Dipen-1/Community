'use client';

import React, { useState } from 'react';
import {
  useGetPlatformLimitsQuery,
  useUpdatePlatformLimitMutation,
  useSetUserLimitOverrideMutation,
  useGetAdminUsersQuery,
  useGetDynamicSubscriptionPlansQuery,
  useCreateOrUpdateSubscriptionPlanMutation,
  useGetModulesAndFeaturesQuery,
  useToggleFeatureMutation,
} from '../../../lib/redux/api/adminApi';

export function AdminBroadcastPanel() {
  const [activeTab, setActiveTab] = useState<'GLOBAL_LIMITS' | 'PLAN_LIMITS' | 'USER_OVERRIDES'>('GLOBAL_LIMITS');

  // Platform limits query
  const { data: limitsData, refetch: refetchLimits } = useGetPlatformLimitsQuery();
  const platformLimits = limitsData?.limits || (Array.isArray(limitsData) ? limitsData : []);
  const broadcastLimits = platformLimits.filter(
    (l: any) => l.limitKey?.startsWith('BROADCAST.')
  );

  const [updatePlatformLimit] = useUpdatePlatformLimitMutation();

  // Subscription plans query
  const { data: plansData, refetch: refetchPlans } = useGetDynamicSubscriptionPlansQuery();
  const plans = plansData?.plans || (Array.isArray(plansData) ? plansData : []);
  const [updateSubscriptionPlan] = useCreateOrUpdateSubscriptionPlanMutation();

  // Feature flags query
  const { data: modulesData, refetch: refetchFlags } = useGetModulesAndFeaturesQuery();
  const modules = modulesData?.modules || (Array.isArray(modulesData) ? modulesData : []);
  const allFeatures: any[] = [];
  modules.forEach((m: any) => {
    if (m.features && Array.isArray(m.features)) {
      allFeatures.push(...m.features);
    }
  });
  const broadcastFeature = allFeatures.find((f: any) => f.key === 'BROADCAST');
  const [toggleFeature] = useToggleFeatureMutation();

  // User overrides
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const { data: usersData } = useGetAdminUsersQuery({ page: 1, limit: 10, search: searchUserQuery });
  const users = usersData?.users || usersData?.data || [];
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST',
    value: 5000,
  });
  const [setUserLimitOverride] = useSetUserLimitOverrideMutation();

  const handleUpdateLimitValue = async (limitKey: string, defaultValue: number) => {
    try {
      await updatePlatformLimit({ limitKey, defaultValue }).unwrap();
      refetchLimits();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update limit value');
    }
  };

  const handleToggleGlobalBroadcast = async () => {
    if (!broadcastFeature) return;
    try {
      await toggleFeature({ key: 'BROADCAST', isEnabled: !broadcastFeature.isEnabled }).unwrap();
      refetchFlags();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to toggle broadcast feature');
    }
  };

  const handleSavePlanLimit = async (plan: any, limitKey: string, value: number) => {
    try {
      const existingLimitMap = (plan.planLimits || []).reduce((acc: any, pl: any) => {
        acc[pl.limitKey] = pl.value;
        return acc;
      }, {});
      existingLimitMap[limitKey] = value;

      await updateSubscriptionPlan({
        id: plan.id,
        name: plan.name,
        limitMap: existingLimitMap,
      }).unwrap();
      refetchPlans();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update plan limits');
    }
  };

  const handleSaveUserOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await setUserLimitOverride({
        userId: selectedUser.id || selectedUser.userId,
        limitKey: overrideForm.limitKey,
        value: Number(overrideForm.value),
      }).unwrap();
      alert(`Broadcast limit override saved for ${selectedUser.fullName || selectedUser.email}`);
      setSelectedUser(null);
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
            <span>📢 Super Admin Broadcast Control Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage global broadcast features, subscription quotas, rate limits, media attachment limits & per-user overrides.
          </p>
        </div>

        {/* Global Master Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Master Broadcast Feature:
          </span>
          <button
            onClick={handleToggleGlobalBroadcast}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              broadcastFeature?.isEnabled
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-rose-600 text-white'
            }`}
          >
            {broadcastFeature?.isEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('GLOBAL_LIMITS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'GLOBAL_LIMITS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          ⚙️ Global Platform Limits
        </button>
        <button
          onClick={() => setActiveTab('PLAN_LIMITS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PLAN_LIMITS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          💳 Subscription Tier Quotas
        </button>
        <button
          onClick={() => setActiveTab('USER_OVERRIDES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'USER_OVERRIDES'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          👤 Per-User Overrides
        </button>
      </div>

      {/* Tab 1: Global Platform Limits */}
      {activeTab === 'GLOBAL_LIMITS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {broadcastLimits.map((limit: any) => (
            <div
              key={limit.limitKey}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md">
                  {limit.limitType}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Unit: {limit.unit}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {limit.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{limit.limitKey}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="number"
                  defaultValue={limit.defaultValue}
                  onBlur={(e) => handleUpdateLimitValue(limit.limitKey, Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-bold"
                />
                <span className="text-xs font-semibold text-slate-500">{limit.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Subscription Tier Quotas */}
      {activeTab === 'PLAN_LIMITS' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Configure dynamic broadcast list limits and recipient capacities per subscription tier (Free, Basic, Pro, Enterprise).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan: any) => {
              const listLimit = (plan.planLimits || []).find((l: any) => l.limitKey === 'BROADCAST.MAX_LISTS')?.value ?? 0;
              const recipientLimit = (plan.planLimits || []).find((l: any) => l.limitKey === 'BROADCAST.MAX_RECIPIENTS_PER_LIST')?.value ?? 0;

              return (
                <div
                  key={plan.id || plan.slug}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase">
                      {plan.name}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                      {plan.slug}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Max Broadcast Lists / User
                      </label>
                      <input
                        type="number"
                        defaultValue={listLimit}
                        onBlur={(e) => handleSavePlanLimit(plan, 'BROADCAST.MAX_LISTS', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Max Recipients / List
                      </label>
                      <input
                        type="number"
                        defaultValue={recipientLimit}
                        onBlur={(e) => handleSavePlanLimit(plan, 'BROADCAST.MAX_RECIPIENTS_PER_LIST', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Per-User Overrides */}
      {activeTab === 'USER_OVERRIDES' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Override Broadcast Limits for a Specific User Account
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Grant higher custom recipient limits (e.g. 5,000 recipients/list) or custom daily quotas to individual VIP business accounts.
            </p>
          </div>

          <form onSubmit={handleSaveUserOverride} className="space-y-4 max-w-xl">
            {/* User Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select Target User *
              </label>
              <input
                type="text"
                placeholder="Search user by name, email, mobile..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              {users.length > 0 && !selectedUser && (
                <div className="mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                  {users.map((u: any) => (
                    <div
                      key={u.userId || u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchUserQuery(u.fullName || u.email);
                      }}
                      className="p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer text-xs flex justify-between"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{u.fullName} ({u.mobileNumber})</span>
                      <span className="text-slate-400">{u.shopName}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg flex items-center justify-between">
                  <span>Selected: {selectedUser.fullName} ({selectedUser.email})</span>
                  <button type="button" onClick={() => setSelectedUser(null)} className="text-rose-600">Change</button>
                </div>
              )}
            </div>

            {/* Limit Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Limit Key
              </label>
              <select
                value={overrideForm.limitKey}
                onChange={(e) => setOverrideForm({ ...overrideForm, limitKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
              >
                <option value="BROADCAST.MAX_LISTS">BROADCAST.MAX_LISTS (Max lists per user)</option>
                <option value="BROADCAST.MAX_RECIPIENTS_PER_LIST">BROADCAST.MAX_RECIPIENTS_PER_LIST (Max recipients/list)</option>
                <option value="BROADCAST.MAX_RECIPIENTS_PER_DAY">BROADCAST.MAX_RECIPIENTS_PER_DAY (Daily recipient quota)</option>
                <option value="BROADCAST.MAX_BROADCASTS_PER_DAY">BROADCAST.MAX_BROADCASTS_PER_DAY (Daily broadcast quota)</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Override Value
              </label>
              <input
                type="number"
                value={overrideForm.value}
                onChange={(e) => setOverrideForm({ ...overrideForm, value: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedUser}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Save User Limit Override
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
