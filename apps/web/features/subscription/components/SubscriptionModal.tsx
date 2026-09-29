'use client';

import React, { useState } from 'react';
import { useGetMySubscriptionQuery, useProcessSubscriptionPaymentMutation } from '../../../lib/redux/api/subscriptionApi';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { data } = useGetMySubscriptionQuery();
  const [processPayment, { isLoading: isSubscribing }] = useProcessSubscriptionPaymentMutation();
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const { settings, subscription } = data;

  // RULE: If Subscription System is OFF OR Subscription Popup is OFF -> DO NOT RENDER MODAL POPUP!
  if (!settings.subscriptionSystemEnabled || !settings.subscriptionPopupEnabled) {
    return null;
  }

  const handleSubscribe = async () => {
    try {
      await processPayment({ planName: 'ENTERPRISE_PRO' }).unwrap();
      setMsg('🎉 Enterprise Subscription activated successfully!');
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Payment failed'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center text-3xl mx-auto shadow-xl">
          💎
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-white mb-2">Upgrade to B2B Enterprise</h3>
          <p className="text-xs text-slate-400">
            Unlock unlimited direct B2B vendor inquiries, multi-community access, verified seller badge, and 100% priority lead batch targeting.
          </p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/40">
            {msg}
          </div>
        )}

        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span> Unlimited Buyer & Seller Messaging
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span> Multi-Community Wholesale Access
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span> Real-Time HD Audio & Video WebRTC Calling
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span> Verified Business Store Page & Catalog
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
          >
            Cancel
          </button>

          {settings.paymentEnabled && (
            <button
              disabled={isSubscribing}
              onClick={handleSubscribe}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isSubscribing ? 'Processing...' : 'Subscribe Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
