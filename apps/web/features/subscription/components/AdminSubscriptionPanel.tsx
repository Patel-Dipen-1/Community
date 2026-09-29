'use client';

import React from 'react';
import {
  useGetSubscriptionSettingsQuery,
  useUpdateSubscriptionSettingsMutation,
} from '../../../lib/redux/api/subscriptionApi';

export function AdminSubscriptionPanel() {
  const { data: settings, isLoading, refetch } = useGetSubscriptionSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateSubscriptionSettingsMutation();
  const [msg, setMsg] = React.useState<string | null>(null);

  if (isLoading || !settings) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
        Loading Subscription Settings Engine...
      </div>
    );
  }

  const handleToggle = async (key: keyof typeof settings, currentValue: boolean) => {
    try {
      const res = await updateSettings({ [key]: !currentValue }).unwrap();
      setMsg(`Updated ${key} -> ${!currentValue ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`);
      refetch();
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      setMsg(`Error updating setting: ${err?.message || 'Failed'}`);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const toggleItems = [
    {
      key: 'subscriptionSystemEnabled' as const,
      title: 'Subscription System (Master Toggle)',
      desc: 'Global ON/OFF for entire subscription module. When OFF, all subscription UI, popups, banners, notifications, links & backend middleware are completely hidden and bypassed.',
      isMaster: true,
      color: 'indigo',
    },
    {
      key: 'freeTrialEnabled' as const,
      title: 'Free Trial Mode',
      desc: 'Controls whether newly registered users receive a free 14-day trial period.',
      color: 'emerald',
    },
    {
      key: 'trialExpiryWarningEnabled' as const,
      title: 'Trial Expiry Warning',
      desc: 'Controls whether users nearing trial expiration see countdown banners and warning alerts.',
      color: 'amber',
    },
    {
      key: 'paymentEnabled' as const,
      title: 'Payment Gateway & Payment Requests',
      desc: 'Controls whether payment collection buttons and payment flow popups are shown.',
      color: 'purple',
    },
    {
      key: 'renewalEnabled' as const,
      title: 'Subscription Renewal',
      desc: 'Controls whether plan renewal options and manual extension buttons are available.',
      color: 'blue',
    },
    {
      key: 'subscriptionNotificationsEnabled' as const,
      title: 'Subscription Notifications',
      desc: 'Controls whether subscription status alert notifications & email triggers are sent.',
      color: 'cyan',
    },
    {
      key: 'subscriptionPopupEnabled' as const,
      title: 'Subscription Modal Popup',
      desc: 'Controls whether automatic subscription paywall modal popups can appear in application.',
      color: 'rose',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💳</span>
            <h2 className="font-extrabold text-xl text-white">Super Admin Subscription Engine Settings</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Independently control subscription features. Disabling any setting instantly removes its UI elements, popups, banners, notifications, links, and backend middleware restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            settings.subscriptionSystemEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${settings.subscriptionSystemEnabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            SYSTEM STATUS: {settings.subscriptionSystemEnabled ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid of Toggles */}
      <div className="grid md:grid-cols-2 gap-6">
        {toggleItems.map((item) => {
          const isEnabled = settings[item.key];
          const isDisabledMaster = !settings.subscriptionSystemEnabled && !item.isMaster;

          return (
            <div
              key={item.key}
              className={`glass-card p-6 rounded-2xl transition-all border ${
                item.isMaster
                  ? 'md:col-span-2 border-indigo-500/50 bg-indigo-950/20'
                  : isDisabledMaster
                  ? 'opacity-50 border-slate-800'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm ${item.isMaster ? 'text-indigo-300 text-base' : 'text-white'}`}>
                      {item.title}
                    </h3>
                    {item.isMaster && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase">
                        Master Switch
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-lg">{item.desc}</p>
                  {isDisabledMaster && (
                    <p className="text-[11px] text-amber-400 font-medium">
                      ⚠️ Ignored because Master Subscription System is currently OFF.
                    </p>
                  )}
                </div>

                {/* Toggle Switch */}
                <button
                  disabled={isUpdating}
                  onClick={() => handleToggle(item.key, isEnabled)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    isEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Setting State:</span>
                <span className={`font-extrabold ${isEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isEnabled ? '✓ ENABLED (ON)' : '✕ DISABLED (OFF)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
