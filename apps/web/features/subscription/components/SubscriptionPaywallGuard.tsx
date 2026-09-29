'use client';

import React, { useState } from 'react';
import { useGetMySubscriptionQuery, useProcessSubscriptionPaymentMutation, useSubmitManualPaymentMutation } from '../../../lib/redux/api/subscriptionApi';
import { API_CONFIG } from '../../../lib/api/config';

interface SubscriptionPaywallGuardProps {
  children: React.ReactNode;
}

export function SubscriptionPaywallGuard({ children }: SubscriptionPaywallGuardProps) {
  const { data, isLoading, refetch } = useGetMySubscriptionQuery();
  const [processPayment, { isLoading: isProcessing }] = useProcessSubscriptionPaymentMutation();
  const [submitManualPayment, { isLoading: isSubmittingManual }] = useSubmitManualPaymentMutation();

  const [selectedMethod, setSelectedMethod] = useState<'RAZORPAY' | 'STRIPE' | 'MANUAL'>('RAZORPAY');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  if (isLoading || !data) {
    return <>{children}</>;
  }

  const { settings, subscription } = data;

  // 1. If Subscription System is OFF -> Bypass Paywall completely!
  if (!settings.subscriptionSystemEnabled) {
    return <>{children}</>;
  }

  // 2. If user subscription is ACTIVE -> Bypass Paywall!
  if (subscription.status === 'ACTIVE') {
    return <>{children}</>;
  }

  // 3. If user is in valid active Free Trial -> Bypass Paywall!
  if (
    subscription.status === 'TRIAL' &&
    settings.freeTrialEnabled &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt) > new Date()
  ) {
    return <>{children}</>;
  }

  const expiryTimestamp = subscription.currentPeriodEnd || subscription.trialEndsAt;
  const expiryDateStr = expiryTimestamp ? new Date(expiryTimestamp).toLocaleDateString() : 'Previous Cycle';
  const expiryTimeStr = expiryTimestamp ? new Date(expiryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM';

  const handleGatewayPayment = async (method: 'RAZORPAY' | 'STRIPE') => {
    try {
      await processPayment({ planName: 'ENTERPRISE_PRO', paymentMethod: method }).unwrap();
      setActionMsg(`🎉 Payment successful via ${method}! All platform features unlocked.`);
      refetch();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      setActionMsg(`❌ ${err?.data?.error || err?.message || 'Payment failed'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_CONFIG.BASE_URL}/upload/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (json.url) {
        setScreenshotUrl(json.url);
        setActionMsg('✅ Payment screenshot uploaded successfully!');
      } else {
        setActionMsg(`❌ File upload failed: ${json.error || 'Server error'}`);
      }
    } catch (err: any) {
      setActionMsg(`❌ File upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!screenshotUrl) {
      setActionMsg('⚠️ Please upload a payment screenshot first.');
      return;
    }

    try {
      await submitManualPayment({ screenshotUrl }).unwrap();
      setActionMsg('🎉 Manual payment screenshot submitted! Super Admin will verify and activate your account.');
      setScreenshotUrl('');
      refetch();
    } catch (err: any) {
      setActionMsg(`❌ ${err?.data?.error || err?.message || 'Submission failed'}`);
    }
  };

  const cleanWhatsapp = (settings.manualPaymentWhatsapp || '').replace(/[^\d+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Hi Super Admin, my B2B subscription expired on ${expiryDateStr} at ${expiryTimeStr}. I want to complete payment to activate my plan.`
  )}`;

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 text-white flex flex-col items-center justify-center p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Paywall Header Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-amber-600 to-purple-600 text-white flex items-center justify-center text-4xl mx-auto shadow-xl border-4 border-slate-800">
          🔒
        </div>

        <div>
          <span className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold uppercase tracking-wider">
            SUBSCRIPTION EXPIRED
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-3 mb-2">
            Complete Payment to Continue Platform Access
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
            Your B2B Enterprise Subscription expired on <strong>{expiryDateStr} at {expiryTimeStr}</strong>. All active device sessions have been locked to protect platform integrity.
          </p>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Payment Gateways Selection */}
        {settings.paymentEnabled && (
          <div className="space-y-4 text-left bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm text-white text-center mb-4">Select Payment Gateway to Instant Unlock</h3>

            <div className="grid md:grid-cols-3 gap-3">
              {settings.razorpayEnabled && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod('RAZORPAY')}
                  className={`p-4 rounded-xl border text-left transition ${selectedMethod === 'RAZORPAY' ? 'border-indigo-500 bg-indigo-950/40' : 'border-slate-800 bg-slate-900'
                    }`}
                >
                  <p className="font-bold text-xs text-white">🇮🇳 Razorpay (India)</p>
                  <p className="text-[10px] text-slate-400">UPI, Net Banking, Cards</p>
                </button>
              )}

              {settings.stripeEnabled && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod('STRIPE')}
                  className={`p-4 rounded-xl border text-left transition ${selectedMethod === 'STRIPE' ? 'border-indigo-500 bg-indigo-950/40' : 'border-slate-800 bg-slate-900'
                    }`}
                >
                  <p className="font-bold text-xs text-white">🌐 Stripe (Global)</p>
                  <p className="text-[10px] text-slate-400">Cards, Apple/Google Pay</p>
                </button>
              )}

              {settings.manualPaymentEnabled && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod('MANUAL')}
                  className={`p-4 rounded-xl border text-left transition ${selectedMethod === 'MANUAL' ? 'border-indigo-500 bg-indigo-950/40' : 'border-slate-800 bg-slate-900'
                    }`}
                >
                  <p className="font-bold text-xs text-white">📱 Manual / WhatsApp</p>
                  <p className="text-[10px] text-slate-400">Upload Screenshot</p>
                </button>
              )}
            </div>

            {/* Selected Action Form */}
            <div className="pt-4 border-t border-slate-800/80">
              {selectedMethod === 'RAZORPAY' && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleGatewayPayment('RAZORPAY')}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isProcessing ? 'Processing Payment...' : 'Pay ₹4,999 with Razorpay & Unlock Platform'}
                </button>
              )}

              {selectedMethod === 'STRIPE' && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleGatewayPayment('STRIPE')}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {isProcessing ? 'Processing Payment...' : 'Pay with Stripe & Unlock Platform'}
                </button>
              )}

              {selectedMethod === 'MANUAL' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-white">Contact Super Admin on WhatsApp</p>
                      <p className="text-[10px] text-slate-400">Ask for QR / UPI payment details</p>
                    </div>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5"
                    >
                      <span>💬</span> WhatsApp
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Upload Payment Receipt Screenshot:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
                    />

                    {screenshotUrl && (
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 max-w-xs">
                        <p className="text-[10px] font-bold text-emerald-400">✓ Screenshot Attached</p>
                        <img src={screenshotUrl} alt="Receipt" className="max-h-28 rounded-lg object-contain" />
                      </div>
                    )}

                    <button
                      disabled={isSubmittingManual || !screenshotUrl}
                      onClick={handleSubmitManual}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
                    >
                      {isSubmittingManual ? 'Submitting Receipt...' : 'Submit Receipt for Super Admin Approval'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
