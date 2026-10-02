'use client';

import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

export function AdminSystemSettingsPanel() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [fcmServerKey, setFcmServerKey] = useState('');
  const [hasFcmKey, setHasFcmKey] = useState(false);
  const [s3Enabled, setS3Enabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [saving2FA, setSaving2FA] = useState(false);
  const [savingS3, setSavingS3] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      // Fetch 2FA status
      const res2FA = await fetch(`${API_CONFIG.BASE_URL}/user/2fa/status`, { headers });
      const data2FA = await res2FA.json();
      if (data2FA.success) {
        setTwoFactorEnabled(data2FA.isGloballyEnabled);
      }

      // Fetch Push config
      const resPush = await fetch(`${API_CONFIG.BASE_URL}/user/push-config`, { headers });
      const dataPush = await resPush.json();
      if (dataPush.success && dataPush.config) {
        setPushEnabled(dataPush.config.enabled);
        setHasFcmKey(dataPush.config.hasKey);
        if (dataPush.config.fcmServerKey) {
          setFcmServerKey(dataPush.config.fcmServerKey);
        }
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async (enable: boolean) => {
    try {
      setSaving2FA(true);
      setMessage(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/2fa-toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled: enable }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(enable);
        setMessage(`✅ Global 2FA / OTP Requirement ${enable ? 'ENABLED' : 'DISABLED'} successfully!`);
      } else {
        setMessage(`❌ ${data.error || 'Failed to update 2FA setting'}`);
      }
    } catch {
      setMessage('❌ Network error updating 2FA setting');
    } finally {
      setSaving2FA(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleSavePushConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPush(true);
      setMessage(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/push-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enabled: pushEnabled,
          fcmServerKey: fcmServerKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushEnabled(data.pushNotificationsEnabled);
        setHasFcmKey(data.hasKey);
        setMessage(`🚀 Push Notifications config saved! ${data.message || ''}`);
      } else {
        setMessage(`❌ ${data.error || 'Failed to save Push config'}`);
      }
    } catch {
      setMessage('❌ Network error saving Push config');
    } finally {
      setSavingPush(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs font-semibold">Loading System Flags & Credentials...</div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-700 text-indigo-200 text-xs font-bold shadow-xl animate-in fade-in duration-200 flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-indigo-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Feature Flag Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* CARD 1: 🔐 Super Admin 2FA / OTP Global Toggle */}
        <div className="glass-card p-6 rounded-3xl border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/30">
                🔐
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Two-Factor Auth (2FA / OTP)</h3>
                <p className="text-[11px] text-slate-400">Authenticator app & 6-digit TOTP verification</p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                twoFactorEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {twoFactorEnabled ? 'ACTIVE & ENFORCED' : 'DISABLED'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            When enabled, users must input a valid 6-digit OTP code generated by Google Authenticator or Authy to complete logins and sensitive operations.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              disabled={saving2FA}
              onClick={() => handleToggle2FA(!twoFactorEnabled)}
              className={`w-full py-3 rounded-2xl text-xs font-extrabold shadow-lg transition flex items-center justify-center gap-2 ${
                twoFactorEnabled
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {saving2FA
                ? 'Updating Flag...'
                : twoFactorEnabled
                ? '🚫 Disable Global 2FA'
                : '✅ Enable Global 2FA'}
            </button>
          </div>
        </div>

        {/* CARD 2: ☁️ AWS S3 Storage & Resumable Chunks Offloader */}
        <div className="glass-card p-6 rounded-3xl border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/30">
                ☁️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">AWS S3 Cloud Offloader</h3>
                <p className="text-[11px] text-slate-400">Resumable chunk uploads & CDN storage</p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                s3Enabled
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {s3Enabled ? 'S3 CDN ACTIVE' : 'LOCAL DISK'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            Automatically offloads large video files & audio status recordings to Amazon S3 buckets with resumable chunk endpoints.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setS3Enabled(!s3Enabled)}
              className={`w-full py-3 rounded-2xl text-xs font-extrabold shadow-lg transition flex items-center justify-center gap-2 ${
                s3Enabled
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {s3Enabled ? '🚫 Switch to Local Disk' : '⚡ Enable S3 Cloud Storage'}
            </button>
          </div>
        </div>

      </div>

      {/* CARD 3: 📱 Mobile Background Push Notifications (FCM Key Configuration) */}
      <div className="glass-card p-6 rounded-3xl border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold border border-purple-500/30">
              📱
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Mobile Background Push Notifications</h3>
              <p className="text-xs text-slate-400">Firebase Cloud Messaging (FCM v1 Engine) & Push Tokens</p>
            </div>
          </div>

          <span
            className={`px-3.5 py-1 rounded-full text-[10px] font-extrabold border ${
              pushEnabled && hasFcmKey
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : pushEnabled && !hasFcmKey
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {pushEnabled && hasFcmKey
              ? '⚡ READY & DISPATCHING'
              : pushEnabled && !hasFcmKey
              ? '⚠️ ENTER FCM KEY TO START'
              : 'DISABLED BY ADMIN'}
          </span>
        </div>

        <form onSubmit={handleSavePushConfig} className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Global Push Feature Flag</div>
              <div className="text-[11px] text-slate-400">Turn mobile push notifications on or off across all user devices</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
              Enter FCM Server Key (Firebase Cloud Messaging Secret Key)
            </label>
            <input
              type="password"
              placeholder="e.g. AIzaSyA... (Paste Firebase FCM Server Key here)"
              value={fcmServerKey}
              onChange={(e) => setFcmServerKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-mono placeholder-slate-600 outline-none focus:border-purple-500 transition"
            />
            <p className="text-[10px] text-slate-400">
              🔑 Must provide a valid FCM Server Key before push notifications will start sending.
            </p>
          </div>

          <button
            type="submit"
            disabled={savingPush}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-xl transition"
          >
            {savingPush ? 'Saving Configuration...' : '💾 Save Push Settings & Start Engine'}
          </button>
        </form>
      </div>
    </div>
  );
}
