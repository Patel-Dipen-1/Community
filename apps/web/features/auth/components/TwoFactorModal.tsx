import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export function TwoFactorModal({ isOpen, onClose, onVerified }: TwoFactorModalProps) {
  const [step, setStep] = useState<'SETUP' | 'VERIFY'>('VERIFY');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetch(`${API_CONFIG.BASE_URL}/user/2fa/status`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isGloballyEnabled && !data.isUserTwoFactorEnabled) {
          setStep('SETUP');
          handleSetup();
        } else {
          setStep('VERIFY');
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/user/2fa/setup`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const data = await res.json();
      if (res.ok && data.secret) {
        setSecret(data.secret);
      } else {
        setError(data.error || 'Failed to setup 2FA');
      }
    } catch (err: any) {
      setError('Network error initializing 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/user/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('2FA Verification Successful!');
        setTimeout(() => {
          if (onVerified) onVerified();
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Invalid 6-digit OTP code');
      }
    } catch (err: any) {
      setError('Network error verifying 2FA OTP code');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-extrabold text-base">🔐 Two-Step Verification</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl text-center">
            {success}
          </div>
        )}

        {step === 'SETUP' && secret && (
          <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
            <p className="text-xs text-slate-300 font-semibold">
              Enter this Secret Key into your Google Authenticator or Authy App:
            </p>
            <div className="text-sm font-mono font-extrabold text-emerald-400 bg-slate-900 py-2 px-3 rounded-xl border border-slate-800 select-all tracking-widest">
              {secret}
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block text-center">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl font-mono tracking-[0.5em] font-extrabold bg-slate-950 border border-slate-800 rounded-2xl py-3 text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
          >
            {loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}
          </button>
        </form>

      </div>
    </div>
  );
}
