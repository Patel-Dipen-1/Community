'use client';

import React, { useState } from 'react';
import {
  useGetModulesAndFeaturesQuery,
  useToggleFeatureMutation,
  useUpdateFeatureMutation,
} from '../../../lib/redux/api/adminApi';
import { useToast } from '../../../components/common/Toast';

export function AdminFeatureFlagsPanel() {
  const { addToast } = useToast();
  const { data: modulesData, isLoading, refetch } = useGetModulesAndFeaturesQuery();
  const [toggleFeature, { isLoading: isToggling }] = useToggleFeatureMutation();
  const [updateFeature] = useUpdateFeatureMutation();
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);

  const modules = modulesData?.modules || [];

  const handleToggle = async (key: string, currentStatus: boolean) => {
    try {
      const res = await toggleFeature({ key, isEnabled: !currentStatus }).unwrap();
      if (res.success) {
        addToast(`✅ Feature ${key} set to ${!currentStatus ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`, 'success');
        refetch();
      }
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || 'Failed to toggle feature'}`, 'error');
    }
  };

  const handlePlatformToggle = async (feature: any, platform: 'webEnabled' | 'mobileEnabled' | 'userEnabled' | 'businessEnabled') => {
    try {
      const newValue = !feature[platform];
      const res = await updateFeature({
        key: feature.key,
        [platform]: newValue,
      }).unwrap();
      if (res.success) {
        addToast(`📱 ${feature.name} ${platform} set to ${newValue ? 'ON' : 'OFF'}`, 'info');
        refetch();
      }
    } catch (err: any) {
      addToast(`❌ Failed to update ${platform}`, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading dynamic feature modules and system flags...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>🎛️</span> Dynamic Feature Flags & Control Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Toggle platform features ON or OFF in real time across Web, Mobile, Users, and Merchants without redeploying code.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
        >
          🔄 Refresh Flags
        </button>
      </div>

      {/* Modules & Feature Flag Cards Grid */}
      <div className="space-y-6">
        {modules.map((mod: any) => (
          <div key={mod.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            {/* Module Title Header */}
            <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{mod.icon || '📦'}</span>
                <div>
                  <h3 className="font-extrabold text-sm text-white">{mod.name}</h3>
                  <p className="text-[11px] text-slate-400">{mod.description}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {mod.features?.length || 0} Features
              </span>
            </div>

            {/* Features List */}
            <div className="divide-y divide-slate-800/50">
              {mod.features.map((feat: any) => (
                <div
                  key={feat.id}
                  className="p-4 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-white">{feat.name}</span>
                      <code className="text-[10px] bg-slate-950 text-emerald-400 px-2 py-0.5 rounded font-mono border border-slate-800">
                        {feat.key}
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{feat.description || 'System feature flag'}</p>
                  </div>

                  {/* Platform Specific Toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Web Toggle */}
                    <button
                      type="button"
                      onClick={() => handlePlatformToggle(feat, 'webEnabled')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
                        feat.webEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                      title="Web Platform Access"
                    >
                      🌐 Web: {feat.webEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Mobile Toggle */}
                    <button
                      type="button"
                      onClick={() => handlePlatformToggle(feat, 'mobileEnabled')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
                        feat.mobileEnabled
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                      title="Mobile App Access"
                    >
                      📱 Mobile: {feat.mobileEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Master Main ON/OFF Switch */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggle(feat.key, feat.isEnabled)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition shadow flex items-center gap-1.5 border ${
                        feat.isEnabled
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${feat.isEnabled ? 'bg-slate-950 animate-pulse' : 'bg-rose-400'}`} />
                      {feat.isEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
