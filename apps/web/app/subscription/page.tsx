'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useGetMySubscriptionQuery,
  useProcessSubscriptionPaymentMutation,
  useSubmitManualPaymentMutation,
  PaymentTransactionData,
} from '../../lib/redux/api/subscriptionApi';
import { SubscriptionBanner } from '../../features/subscription/components/SubscriptionBanner';
import { InvoiceModal } from '../../features/subscription/components/InvoiceModal';
import { API_CONFIG } from '../../lib/api/config';

export default function SubscriptionPage() {
  const { data, isLoading, refetch } = useGetMySubscriptionQuery();
  const [processPayment, { isLoading: isProcessing }] = useProcessSubscriptionPaymentMutation();
  const [submitManualPayment, { isLoading: isSubmittingManual }] = useSubmitManualPaymentMutation();
  
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'RAZORPAY' | 'STRIPE' | 'MANUAL'>('RAZORPAY');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [viewingInvoice, setViewingInvoice] = useState<PaymentTransactionData | null>(null);

  const activeCycles = data?.activeCycles || [];

  useEffect(() => {
    if (activeCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(activeCycles[0].id);
    }
  }, [activeCycles, selectedCycleId]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading Subscription Account Details...
      </div>
    );
  }

  const { settings, subscription, transactions } = data;

  // RULE: If Subscription System is DISABLED (OFF) -> Hide Subscription Dashboard UI
  if (!settings.subscriptionSystemEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-3xl mb-4">
          ℹ️
        </div>
        <h2 className="text-xl font-bold mb-2">Subscription System Inactive</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          The subscription system is currently disabled by Super Admin. All platform features are open and standard.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const selectedCycleObj = activeCycles.find((c) => c.id === selectedCycleId) || activeCycles[0];

  const handleGatewayPayment = async (method: 'RAZORPAY' | 'STRIPE') => {
    try {
      const res = await processPayment({
        planName: 'ENTERPRISE_PRO',
        paymentMethod: method,
        cycleId: selectedCycleId,
      }).unwrap();

      setActionMsg(`🎉 Payment successful via ${method}! Subscription plan activated.`);
      refetch();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg(`❌ ${err?.data?.error || err?.message || 'Payment processing failed'}`);
      setTimeout(() => setActionMsg(null), 4000);
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
      await submitManualPayment({
        screenshotUrl,
        cycleId: selectedCycleId,
      }).unwrap();

      setActionMsg('🎉 Manual payment screenshot submitted! Super Admin will verify and activate your plan.');
      setScreenshotUrl('');
      refetch();
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      setActionMsg(`❌ ${err?.data?.error || err?.message || 'Submission failed'}`);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const cleanWhatsapp = (settings.manualPaymentWhatsapp || '').replace(/[^\d+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Hi Super Admin, I want to complete payment for plan "${selectedCycleObj?.name || 'Enterprise'}" (₹${selectedCycleObj?.amount || 4999}).`
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <SubscriptionBanner />

      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-lg text-white">
            B2B Network
          </Link>
          <span className="text-xs text-slate-500">/ Subscription & Payment Center</span>
        </div>

        <Link
          href="/"
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          ← Back to App
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Account Subscription & Billing Engine</h1>
          <p className="text-xs text-slate-400">
            Select your preferred dynamic payment cycle (1M, 3M, 6M, 12M, etc.) and payment gateway to activate enterprise features.
          </p>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-extrabold uppercase">
                {subscription.planName}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                subscription.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : subscription.status === 'TRIAL'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                STATUS: {subscription.status}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {subscription.status === 'TRIAL' && subscription.trialEndsAt
                ? `Free Trial active until ${new Date(subscription.trialEndsAt).toLocaleDateString()}`
                : subscription.currentPeriodEnd
                ? `Subscription active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()} (${new Date(subscription.currentPeriodEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                : 'Enterprise Access Active'}
            </p>
          </div>
        </div>

        {/* 1. DYNAMIC PAYMENT CYCLES SELECTION */}
        {settings.paymentEnabled && (
          <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-6">
            <div>
              <h2 className="font-extrabold text-lg text-white">1. Choose Payment Cycle Plan</h2>
              <p className="text-xs text-slate-400">Dynamic subscription durations created by Super Admin.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    selectedCycleId === cycle.id
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-xl ring-2 ring-indigo-500/50'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-400">{cycle.durationMonths} Month(s)</span>
                    {selectedCycleId === cycle.id && <span className="text-indigo-400 font-bold text-xs">✓ Selected</span>}
                  </div>
                  <h3 className="font-extrabold text-base text-white">{cycle.name}</h3>
                  <p className="text-xl font-extrabold text-emerald-400 font-mono">₹{cycle.amount.toLocaleString()}</p>
                  {cycle.description && <p className="text-[11px] text-slate-400 line-clamp-2">{cycle.description}</p>}
                </div>
              ))}
            </div>

            {/* 2. PAYMENT GATEWAY SELECTION */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h2 className="font-extrabold text-lg text-white">2. Select Payment Gateway</h2>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Razorpay */}
                {settings.razorpayEnabled && (
                  <div
                    onClick={() => setSelectedMethod('RAZORPAY')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      selectedMethod === 'RAZORPAY'
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🇮🇳</span>
                      {selectedMethod === 'RAZORPAY' && <span className="text-indigo-400 font-bold text-xs">✓ Selected</span>}
                    </div>
                    <h3 className="font-bold text-sm text-white">Razorpay (India)</h3>
                    <p className="text-[11px] text-slate-400 mt-1">UPI (GPay, PhonePe, Paytm), Net Banking, Cards</p>
                  </div>
                )}

                {/* Stripe */}
                {settings.stripeEnabled && (
                  <div
                    onClick={() => setSelectedMethod('STRIPE')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      selectedMethod === 'STRIPE'
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🌐</span>
                      {selectedMethod === 'STRIPE' && <span className="text-indigo-400 font-bold text-xs">✓ Selected</span>}
                    </div>
                    <h3 className="font-bold text-sm text-white">Stripe (Global)</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Global Credit Cards, Apple Pay, Google Pay</p>
                  </div>
                )}

                {/* Manual Payment */}
                {settings.manualPaymentEnabled && (
                  <div
                    onClick={() => setSelectedMethod('MANUAL')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      selectedMethod === 'MANUAL'
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">📱</span>
                      {selectedMethod === 'MANUAL' && <span className="text-indigo-400 font-bold text-xs">✓ Selected</span>}
                    </div>
                    <h3 className="font-bold text-sm text-white">Manual Payment / WhatsApp</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Contact Super Admin on WhatsApp & upload screenshot</p>
                  </div>
                )}
              </div>

              {/* Selected Method Action Form */}
              <div className="pt-4 border-t border-slate-800">
                {selectedMethod === 'RAZORPAY' && (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">Razorpay Secure Checkout</p>
                      <p className="text-xs text-slate-400">
                        Selected Plan: <strong>{selectedCycleObj?.name}</strong> (₹{selectedCycleObj?.amount?.toLocaleString()} for {selectedCycleObj?.durationMonths} Month(s))
                      </p>
                    </div>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleGatewayPayment('RAZORPAY')}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing Razorpay...' : `Pay ₹${selectedCycleObj?.amount?.toLocaleString()} with Razorpay`}
                    </button>
                  </div>
                )}

                {selectedMethod === 'STRIPE' && (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">Stripe International Checkout</p>
                      <p className="text-xs text-slate-400">
                        Selected Plan: <strong>{selectedCycleObj?.name}</strong> (₹{selectedCycleObj?.amount?.toLocaleString()})
                      </p>
                    </div>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleGatewayPayment('STRIPE')}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing Stripe...' : `Pay ₹${selectedCycleObj?.amount?.toLocaleString()} with Stripe`}
                    </button>
                  </div>
                )}

                {selectedMethod === 'MANUAL' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-xs font-bold text-white mb-0.5">Need Help or Bank/UPI Transfer Details?</p>
                        <p className="text-[11px] text-slate-400">Chat directly with Super Admin on WhatsApp to receive QR / UPI details.</p>
                      </div>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center gap-2"
                      >
                        <span>💬</span> Contact on WhatsApp
                      </a>
                    </div>

                    <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <label className="text-xs font-bold text-slate-200">Upload Payment Screenshot for "{selectedCycleObj?.name}":</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                        />
                        {isUploading && <span className="text-xs text-indigo-400 font-semibold animate-pulse">Uploading screenshot...</span>}
                      </div>

                      {screenshotUrl && (
                        <div className="mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800 max-w-xs">
                          <p className="text-[10px] font-bold text-emerald-400 mb-1">✓ Screenshot Attached</p>
                          <img src={screenshotUrl} alt="Payment Screenshot" className="max-h-36 rounded-lg object-contain" />
                        </div>
                      )}

                      <button
                        disabled={isSubmittingManual || !screenshotUrl}
                        onClick={handleSubmitManual}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
                      >
                        {isSubmittingManual ? 'Submitting Receipt...' : 'Submit Receipt for Super Admin Verification'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment History & Tax Invoices */}
        <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
          <h2 className="font-bold text-lg text-white">Payment History & Tax Invoices</h2>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400">No payment transaction records found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Payment Cycle Plan</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">{t.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-300">{t.cycleName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-emerald-400">₹{t.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {t.paymentDate ? new Date(t.paymentDate).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : t.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {t.status === 'COMPLETED' && (
                          <button
                            onClick={() => setViewingInvoice(t)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow"
                          >
                            📄 Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* PDF Invoice Modal Viewer */}
      <InvoiceModal transaction={viewingInvoice} onClose={() => setViewingInvoice(null)} />
    </div>
  );
}
