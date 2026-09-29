'use client';

import React, { useState } from 'react';
import {
  useGetSubscriptionSettingsQuery,
  useUpdateSubscriptionSettingsMutation,
  useGetPaymentDashboardQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
  PaymentTransactionData,
} from '../../../lib/redux/api/subscriptionApi';
import { InvoiceModal } from './InvoiceModal';
import { AdminCyclesManager } from './AdminCyclesManager';

export function AdminPaymentPanel() {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'GATEWAYS' | 'CYCLES' | 'TRANSACTIONS' | 'PENDING' | 'COMPLETED' | 'DUE'>('METRICS');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingScreenshot, setInspectingScreenshot] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<PaymentTransactionData | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: settings, refetch: refetchSettings } = useGetSubscriptionSettingsQuery();
  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdateSubscriptionSettingsMutation();

  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useGetPaymentDashboardQuery({
    status: activeTab === 'PENDING' ? 'PENDING_VERIFICATION' : activeTab === 'COMPLETED' ? 'COMPLETED' : activeTab === 'DUE' ? 'DUE' : 'ALL',
    search: searchQuery,
  });

  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation();
  const [rejectPayment, { isLoading: isRejecting }] = useRejectPaymentMutation();

  const [whatsappInput, setWhatsappInput] = useState<string>('');
  const [selectedCyclesMap, setSelectedCyclesMap] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (settings?.manualPaymentWhatsapp) {
      setWhatsappInput(settings.manualPaymentWhatsapp);
    }
  }, [settings]);

  if (!settings) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Payment Engine Controls...</div>;
  }

  const handleToggleGateway = async (key: 'razorpayEnabled' | 'stripeEnabled' | 'manualPaymentEnabled', currentValue: boolean) => {
    try {
      await updateSettings({ [key]: !currentValue }).unwrap();
      setMsg(`Updated ${key} -> ${!currentValue ? 'ENABLED' : 'DISABLED'}`);
      refetchSettings();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`❌ Error: ${err?.message || 'Failed to update'}`);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleSaveWhatsapp = async () => {
    try {
      await updateSettings({ manualPaymentWhatsapp: whatsappInput }).unwrap();
      setMsg('✅ Super Admin WhatsApp payment contact number saved successfully!');
      refetchSettings();
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      setMsg(`❌ Error saving WhatsApp number: ${err?.message || 'Failed'}`);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const handleApprove = async (transactionId: string, cycleId?: string) => {
    try {
      const res = await approvePayment({ transactionId, cycleId }).unwrap();
      setMsg(`✅ Payment ${res.transaction.invoiceNumber} approved! User subscription activated for ${res.transaction.cycleName}.`);
      refetchDashboard();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to approve payment'}`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleReject = async (transactionId: string) => {
    const reason = prompt('Enter rejection reason for this payment transaction:');
    if (!reason) return;

    try {
      await rejectPayment({ transactionId, reason }).unwrap();
      setMsg('❌ Payment rejected.');
      refetchDashboard();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to reject payment'}`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const metrics = dashboardData?.metrics || {
    totalUsers: 0,
    completedUsersCount: 0,
    dueUsersCount: 0,
    pendingVerificationCount: 0,
    totalRevenue: 0,
  };

  const transactions = dashboardData?.transactions || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💳</span>
            <h2 className="font-extrabold text-xl text-white">Super Admin Payment Management System</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure payment gateways (Razorpay, Stripe, Manual), manage manual WhatsApp payments, inspect payment screenshots, verify transactions, and issue tax invoices.
          </p>
        </div>

        {/* Sub-Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('METRICS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'METRICS' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            📊 Dashboard Metrics
          </button>
          <button
            onClick={() => setActiveTab('GATEWAYS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'GATEWAYS' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            ⚙️ Gateway Settings
          </button>
          <button
            onClick={() => setActiveTab('CYCLES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'CYCLES' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-purple-300 hover:text-white'
            }`}
          >
            🔄 Dynamic Cycles / Plans
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition relative ${
              activeTab === 'PENDING' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white'
            }`}
          >
            ⏳ Pending Screenshots ({metrics.pendingVerificationCount})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white'
            }`}
          >
            ✓ Completed & Invoices ({metrics.completedUsersCount})
          </button>
          <button
            onClick={() => setActiveTab('DUE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'DUE' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-white'
            }`}
          >
            ⚠️ Pending Due Users ({metrics.dueUsersCount})
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* METRICS DASHBOARD VIEW */}
      {activeTab === 'METRICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-card p-5 rounded-2xl border-slate-800">
              <p className="text-xs text-slate-400 font-medium mb-1">Total Users</p>
              <p className="text-3xl font-extrabold text-white">{metrics.totalUsers}</p>
              <p className="text-[11px] text-slate-500 mt-2">Registered Accounts</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-emerald-500/30">
              <p className="text-xs text-emerald-400 font-medium mb-1">Completed Payment Users</p>
              <p className="text-3xl font-extrabold text-emerald-300">{metrics.completedUsersCount}</p>
              <p className="text-[11px] text-emerald-500/80 mt-2">Active Paid Subscriptions</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-rose-500/30">
              <p className="text-xs text-rose-400 font-medium mb-1">Pending / Due Users</p>
              <p className="text-3xl font-extrabold text-rose-300">{metrics.dueUsersCount}</p>
              <p className="text-[11px] text-rose-500/80 mt-2">Trial / Expired Users</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-indigo-500/30">
              <p className="text-xs text-indigo-400 font-medium mb-1">Total Platform Revenue</p>
              <p className="text-3xl font-extrabold text-indigo-300 font-mono">₹{metrics.totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-indigo-400/80 mt-2">Total Verified Collections</p>
            </div>
          </div>
        </div>
      )}

      {/* GATEWAYS CONTROL PANEL VIEW */}
      {activeTab === 'GATEWAYS' && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Razorpay Card */}
          <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇮🇳</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Razorpay (India)</h3>
                  <p className="text-[10px] text-slate-400">UPI, Net Banking, Cards, Mandate</p>
                </div>
              </div>
              <button
                disabled={isUpdatingSettings}
                onClick={() => handleToggleGateway('razorpayEnabled', settings.razorpayEnabled)}
                className={`h-6 w-12 rounded-full p-0.5 transition-colors ${
                  settings.razorpayEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.razorpayEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="text-xs text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl">
              <p>✓ UPI (GPay, PhonePe, Paytm)</p>
              <p>✓ Net Banking & Corporate Cards</p>
              <p>✓ Auto-Debit & Recurring Mandates</p>
            </div>
          </div>

          {/* Stripe Card */}
          <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Stripe (Global)</h3>
                  <p className="text-[10px] text-slate-400">Cards, Apple/Google Pay, SEPA</p>
                </div>
              </div>
              <button
                disabled={isUpdatingSettings}
                onClick={() => handleToggleGateway('stripeEnabled', settings.stripeEnabled)}
                className={`h-6 w-12 rounded-full p-0.5 transition-colors ${
                  settings.stripeEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.stripeEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="text-xs text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl">
              <p>✓ Global Debit & Credit Cards</p>
              <p>✓ Apple Pay & Google Pay</p>
              <p>✓ SEPA & Wire Direct Transfer</p>
            </div>
          </div>

          {/* Manual Payment Card */}
          <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4 md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Manual Payment & WhatsApp Verification</h3>
                  <p className="text-[10px] text-slate-400">Allows users to contact support on WhatsApp & submit payment screenshots</p>
                </div>
              </div>
              <button
                disabled={isUpdatingSettings}
                onClick={() => handleToggleGateway('manualPaymentEnabled', settings.manualPaymentEnabled)}
                className={`h-6 w-12 rounded-full p-0.5 transition-colors ${
                  settings.manualPaymentEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.manualPaymentEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Super Admin Contact WhatsApp Number:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="+919999999999"
                    className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                  <button
                    disabled={isUpdatingSettings}
                    onClick={handleSaveWhatsapp}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md"
                  >
                    Save Number
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Users clicking "Contact on WhatsApp" will automatically open this WhatsApp number with payment inquiry text.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-emerald-400">📱 Manual Payment Workflow:</p>
                <p>1. User clicks "Contact on WhatsApp" button.</p>
                <p>2. User pays via UPI/Bank Transfer and uploads screenshot.</p>
                <p>3. Super Admin reviews screenshot in "Pending Screenshots" queue and approves payment.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC PAYMENT CYCLES / PLANS MANAGEMENT VIEW */}
      {activeTab === 'CYCLES' && <AdminCyclesManager />}

      {/* TRANSACTIONS TABLE & QUEUE VIEW */}
      {(activeTab === 'TRANSACTIONS' || activeTab === 'PENDING' || activeTab === 'COMPLETED' || activeTab === 'DUE') && (
        <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white">
                {activeTab === 'PENDING'
                  ? '⏳ Pending Manual Payment Screenshots'
                  : activeTab === 'COMPLETED'
                  ? '✓ Completed Paid Accounts & Tax Invoices'
                  : activeTab === 'DUE'
                  ? '⚠️ Pending & Due Payment Users'
                  : '📋 All Payment Transactions'}
              </h3>
              <p className="text-xs text-slate-400">
                {transactions.length} record(s) found.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search user, mobile, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs w-64"
            />
          </div>

          {isDashboardLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading transaction records...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No transactions matching this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Invoice / Ref</th>
                    <th className="py-3 px-3">User / Business</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Payment Cycle</th>
                    <th className="py-3 px-3">Date / Due</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {t.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{t.user?.business?.shopName || t.user?.fullName}</div>
                        <div className="text-[11px] text-slate-400">{t.user?.fullName} ({t.user?.mobileNumber})</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-emerald-400">
                        ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {t.cycleName}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        <div>{t.paymentDate ? new Date(t.paymentDate).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</div>
                        {t.nextDueDate && (
                          <div className="text-[10px] text-amber-400">Due: {new Date(t.nextDueDate).toLocaleDateString()}</div>
                        )}
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
                      <td className="py-3 px-3 text-right space-x-2">
                        {t.screenshotUrl && (
                          <button
                            onClick={() => setInspectingScreenshot(t.screenshotUrl || null)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:text-white text-[11px] font-semibold"
                          >
                            🖼️ Screenshot
                          </button>
                        )}

                        {t.status === 'PENDING_VERIFICATION' && (
                          <div className="flex items-center gap-1.5 justify-end flex-wrap">
                            <select
                              value={selectedCyclesMap[t.id] || t.cycleId || dashboardData?.cycles?.[0]?.id || ''}
                              onChange={(e) => setSelectedCyclesMap({ ...selectedCyclesMap, [t.id]: e.target.value })}
                              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-semibold"
                            >
                              {dashboardData?.cycles?.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (₹{c.amount.toLocaleString()})
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={isApproving}
                              onClick={() => handleApprove(t.id, selectedCyclesMap[t.id] || t.cycleId || dashboardData?.cycles?.[0]?.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition flex items-center gap-1"
                            >
                              <span>✓</span> Approve Plan
                            </button>
                            <button
                              disabled={isRejecting}
                              onClick={() => handleReject(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {t.status === 'COMPLETED' && (
                          <button
                            onClick={() => setViewingInvoice(t)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow transition"
                          >
                            📄 View Invoice
                          </button>
                        )}

                        {t.status === 'DUE' && (
                          <div className="flex items-center gap-1.5 justify-end flex-wrap">
                            <select
                              value={selectedCyclesMap[t.id] || t.cycleId || dashboardData?.cycles?.[0]?.id || ''}
                              onChange={(e) => setSelectedCyclesMap({ ...selectedCyclesMap, [t.id]: e.target.value })}
                              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-semibold"
                            >
                              {dashboardData?.cycles?.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (₹{c.amount.toLocaleString()})
                                </option>
                              ))}
                            </select>

                            <button
                              disabled={isApproving}
                              onClick={() => handleApprove(t.id, selectedCyclesMap[t.id] || t.cycleId || dashboardData?.cycles?.[0]?.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition flex items-center gap-1"
                            >
                              <span>✓</span> Activate Selected Plan
                            </button>
                            <a
                              href={`https://wa.me/${(t.user?.mobileNumber || '').replace(/[^\d+]/g, '')}?text=${encodeURIComponent(`Hi ${t.user?.fullName}, your B2B Enterprise Subscription payment is pending/due. Please renew your plan.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition inline-flex items-center gap-1"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Inspecting Manual Payment Screenshot */}
      {inspectingScreenshot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4">
            <h3 className="font-bold text-lg text-white">Manual Payment Screenshot Verification</h3>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-2">
              <img src={inspectingScreenshot} alt="Payment Receipt" className="max-w-full mx-auto rounded-xl object-contain" />
            </div>
            <button
              onClick={() => setInspectingScreenshot(null)}
              className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Close Screenshot
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal Viewer */}
      <InvoiceModal transaction={viewingInvoice} onClose={() => setViewingInvoice(null)} />
    </div>
  );
}
