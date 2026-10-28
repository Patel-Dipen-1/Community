'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetSubscriptionSettingsQuery,
  useUpdateSubscriptionSettingsMutation,
  useGetPaymentCyclesQuery,
  useCreatePaymentCycleMutation,
  useUpdatePaymentCycleMutation,
  useDeletePaymentCycleMutation,
  useGetPaymentDashboardQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
  PaymentCycleData,
  PaymentTransactionData,
  SystemSettings,
} from '../../../lib/redux/api/subscriptionApi';
import { InvoiceModal } from './InvoiceModal';

interface AdminSubscriptionPanelProps {
  initialTab?: 'DUAL' | 'PLANS' | 'PENDING' | 'GATEWAYS' | 'TRANSACTIONS' | 'FLAGS';
}

export function AdminSubscriptionPanel({ initialTab = 'DUAL' }: AdminSubscriptionPanelProps) {
  // Main view state: DUAL (Side-by-Side) or full-width deep-dives
  const [activeView, setActiveView] = useState<'DUAL' | 'PLANS' | 'PENDING' | 'GATEWAYS' | 'TRANSACTIONS' | 'FLAGS'>(initialTab);

  // Sub-tab inside the right-hand column when in DUAL view
  const [dualRightTab, setDualRightTab] = useState<'PLANS' | 'PENDING' | 'GATEWAYS' | 'TRANSACTIONS'>('PLANS');

  // Transactions ledger filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING_VERIFICATION' | 'DUE' | 'REJECTED'>('ALL');

  // Modal & inspection states
  const [inspectingScreenshot, setInspectingScreenshot] = useState<{ url: string; transaction: PaymentTransactionData } | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<PaymentTransactionData | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // RTK Query Hooks
  const { data: settings, isLoading: isSettingsLoading, refetch: refetchSettings } = useGetSubscriptionSettingsQuery();
  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdateSubscriptionSettingsMutation();

  const { data: cycles = [], isLoading: isCyclesLoading, refetch: refetchCycles } = useGetPaymentCyclesQuery();
  const [createCycle, { isLoading: isCreatingCycle }] = useCreatePaymentCycleMutation();
  const [updateCycle, { isLoading: isUpdatingCycle }] = useUpdatePaymentCycleMutation();
  const [deleteCycle, { isLoading: isDeletingCycle }] = useDeletePaymentCycleMutation();

  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useGetPaymentDashboardQuery({
    status: activeView === 'PENDING' || (activeView === 'DUAL' && dualRightTab === 'PENDING') ? 'PENDING_VERIFICATION' : statusFilter,
    search: searchQuery,
  });

  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation();
  const [rejectPayment, { isLoading: isRejecting }] = useRejectPaymentMutation();

  // WhatsApp support phone state
  const [whatsappInput, setWhatsappInput] = useState('');
  useEffect(() => {
    if (settings?.manualPaymentWhatsapp) {
      setWhatsappInput(settings.manualPaymentWhatsapp);
    }
  }, [settings?.manualPaymentWhatsapp]);

  // Selected cycles map for assigning cycle to pending transactions
  const [selectedCyclesMap, setSelectedCyclesMap] = useState<Record<string, string>>({});

  // Plan creation / edit modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentCycleData | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    durationMonths: 1,
    amount: 999,
    description: '',
    isActive: true,
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // Toggle boolean setting
  const handleToggleSetting = async (key: keyof SystemSettings, currentValue: boolean) => {
    try {
      await updateSettings({ [key]: !currentValue }).unwrap();
      showToast(`${String(key)} is now ${!currentValue ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`, 'success');
      refetchSettings();
    } catch (err: any) {
      showToast(`Failed to update ${String(key)}: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Save WhatsApp contact
  const handleSaveWhatsapp = async () => {
    try {
      await updateSettings({ manualPaymentWhatsapp: whatsappInput }).unwrap();
      showToast('Super Admin WhatsApp payment number saved!', 'success');
      refetchSettings();
    } catch (err: any) {
      showToast(`Error saving WhatsApp number: ${err?.message || 'Failed'}`, 'error');
    }
  };

  // Plan CRUD handlers
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      durationMonths: 1,
      amount: 999,
      description: '',
      isActive: true,
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PaymentCycleData) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      durationMonths: plan.durationMonths,
      amount: plan.amount,
      description: plan.description || '',
      isActive: plan.isActive,
    });
    setIsPlanModalOpen(true);
  };

  const handleTogglePlanActive = async (plan: PaymentCycleData) => {
    try {
      await updateCycle({
        id: plan.id,
        data: { isActive: !plan.isActive },
      }).unwrap();
      showToast(`Plan "${plan.name}" ${!plan.isActive ? 'Activated' : 'Deactivated'}`, 'success');
      refetchCycles();
    } catch (err: any) {
      showToast(`Failed to update plan: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleDeletePlan = async (plan: PaymentCycleData) => {
    if (!confirm(`Are you sure you want to permanently delete "${plan.name}"?`)) return;
    try {
      await deleteCycle(plan.id).unwrap();
      showToast(`Plan "${plan.name}" deleted successfully.`, 'success');
      refetchCycles();
    } catch (err: any) {
      showToast(`Failed to delete plan: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleSubmitPlanForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updateCycle({
          id: editingPlan.id,
          data: planForm,
        }).unwrap();
        showToast(`Plan "${planForm.name}" updated successfully!`, 'success');
      } else {
        await createCycle(planForm).unwrap();
        showToast(`New Plan "${planForm.name}" created successfully!`, 'success');
      }
      setIsPlanModalOpen(false);
      refetchCycles();
      refetchDashboard();
    } catch (err: any) {
      showToast(`Error saving plan: ${err?.data?.error || err?.message || 'Failed'}`, 'error');
    }
  };

  // Payment proof approve & reject handlers
  const handleApproveTransaction = async (transactionId: string, cycleId?: string) => {
    try {
      const res = await approvePayment({ transactionId, cycleId }).unwrap();
      showToast(`Payment approved! Subscription activated for ${res.transaction.user?.fullName || 'User'}.`, 'success');
      setInspectingScreenshot(null);
      refetchDashboard();
    } catch (err: any) {
      showToast(`Approval failed: ${err?.data?.error || err?.message || 'Error'}`, 'error');
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    const reason = prompt('Enter rejection reason for this payment receipt:');
    if (!reason) return;
    try {
      await rejectPayment({ transactionId, reason }).unwrap();
      showToast('Payment rejected.', 'info');
      setInspectingScreenshot(null);
      refetchDashboard();
    } catch (err: any) {
      showToast(`Rejection failed: ${err?.data?.error || err?.message || 'Error'}`, 'error');
    }
  };

  if (isSettingsLoading || !settings) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm animate-pulse space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading Super Admin Subscription & Billing Engine...</p>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {
    totalUsers: 0,
    completedUsersCount: 0,
    dueUsersCount: 0,
    pendingVerificationCount: 0,
    totalRevenue: 0,
  };

  const transactions = dashboardData?.transactions || [];
  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING_VERIFICATION');
  const activePlansCount = cycles.filter((c) => c.isActive).length;

  const flagItems = [
    {
      key: 'subscriptionSystemEnabled' as const,
      title: 'Subscription System (Master Switch)',
      desc: 'Master global ON/OFF for the entire subscription engine. Disabling this completely bypasses all paywalls, popups, and banners across web and mobile apps.',
      isMaster: true,
      color: 'indigo',
    },
    {
      key: 'freeTrialEnabled' as const,
      title: 'Free Trial Mode',
      desc: 'Controls whether newly registered accounts receive an automatic 14-day full platform trial.',
      color: 'emerald',
    },
    {
      key: 'trialExpiryWarningEnabled' as const,
      title: 'Trial Expiry Warning Banners',
      desc: 'Controls whether users nearing trial expiration receive warning banners and countdown alerts.',
      color: 'amber',
    },
    {
      key: 'paymentEnabled' as const,
      title: 'Payment Gateway & Checkout Flow',
      desc: 'Controls whether payment checkout buttons and collection dialogs are accessible to users.',
      color: 'purple',
    },
    {
      key: 'renewalEnabled' as const,
      title: 'Subscription Renewal & Extension',
      desc: 'Allows users with expiring or expired plans to manually renew or upgrade their subscription.',
      color: 'blue',
    },
    {
      key: 'subscriptionPopupEnabled' as const,
      title: 'Automatic Paywall Modal Popups',
      desc: 'Enforces full-screen modal paywall popups when expired users attempt to access restricted business features.',
      color: 'rose',
    },
    {
      key: 'subscriptionNotificationsEnabled' as const,
      title: 'Subscription Notification Alerts',
      desc: 'Triggers push notifications and system messages for renewal reminders and payment approvals.',
      color: 'cyan',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & KPI METRICS */}
      <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/30 backdrop-blur-xl shadow-2xl space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 text-2xl border border-indigo-500/30 shadow-inner">
                ⚡
              </span>
              <div>
                <h1 className="font-extrabold text-2xl text-white tracking-tight flex items-center gap-2.5">
                  Super Admin Subscription Engine Settings
                </h1>
                <p className="text-xs text-slate-400 max-w-3xl mt-0.5">
                  Unified Control Center: Manage engine flags and rules on one side, and all subscription plans, payment gateways, proof verifications, and invoices on the other side.
                </p>
              </div>
            </div>
          </div>

          {/* Master System Status Pill */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 border shadow-lg transition-all ${
                settings.subscriptionSystemEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-rose-500/10'
              }`}
            >
              <span className="relative flex h-3 w-3">
                {settings.subscriptionSystemEnabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    settings.subscriptionSystemEnabled ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span>
                ENGINE STATUS: {settings.subscriptionSystemEnabled ? 'LIVE & ENFORCED (ON)' : 'BYPASS MODE (OFF)'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Platform KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          <div className="glass-card p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/20">
            <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">Total Platform Revenue</p>
            <p className="text-xl font-extrabold text-indigo-200 font-mono mt-1">
              ₹{metrics.totalRevenue.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified collections</p>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20">
            <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Active Subscribers</p>
            <p className="text-xl font-extrabold text-emerald-300 font-mono mt-1">
              {metrics.completedUsersCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Paid active businesses</p>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border border-amber-500/20 bg-amber-950/20">
            <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center justify-between">
              <span>Pending Proofs</span>
              {metrics.pendingVerificationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold animate-pulse">
                  ACTION NEEDED
                </span>
              )}
            </p>
            <p className="text-xl font-extrabold text-amber-300 font-mono mt-1">
              {metrics.pendingVerificationCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Waiting screenshot review</p>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border border-rose-500/20 bg-rose-950/20">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Due / Expired Users</p>
            <p className="text-xl font-extrabold text-rose-300 font-mono mt-1">
              {metrics.dueUsersCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Paywall triggered</p>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border border-purple-500/20 bg-purple-950/20 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">Dynamic Plans</p>
            <p className="text-xl font-extrabold text-purple-300 font-mono mt-1">
              {activePlansCount} <span className="text-xs text-slate-400 font-normal">/ {cycles.length}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Live on user screens</p>
          </div>
        </div>
      </div>

      {/* Toast Notification Alert */}
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-xl animate-in slide-in-from-top-2 duration-200 ${
            msg.type === 'error'
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : msg.type === 'info'
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{msg.type === 'error' ? '❌' : msg.type === 'info' ? 'ℹ️' : '✅'}</span>
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>
      )}

      {/* 2. VIEW SWITCHER NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveView('DUAL')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeView === 'DUAL'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>🎛️</span>
          <span>Dual Console (Side-by-Side)</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold uppercase tracking-wider">
            Unified
          </span>
        </button>

        <button
          onClick={() => setActiveView('PLANS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeView === 'PLANS'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>📦</span>
          <span>Subscription Plans ({cycles.length})</span>
        </button>

        <button
          onClick={() => setActiveView('PENDING')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 relative ${
            activeView === 'PENDING'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white hover:border-amber-600/40'
          }`}
        >
          <span>⏳</span>
          <span>Pending Verifications</span>
          {metrics.pendingVerificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
              {metrics.pendingVerificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('GATEWAYS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeView === 'GATEWAYS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>💳</span>
          <span>Gateways & WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveView('TRANSACTIONS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeView === 'TRANSACTIONS'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white hover:border-emerald-600/40'
          }`}
        >
          <span>🧾</span>
          <span>Transactions & Invoices</span>
        </button>

        <button
          onClick={() => setActiveView('FLAGS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeView === 'FLAGS'
              ? 'bg-slate-700 text-white shadow-lg'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>🚩</span>
          <span>All Engine Flags</span>
        </button>
      </div>

      {/* 3. DUAL CONSOLE (SIDE-BY-SIDE UNIFIED LAYOUT) */}
      {activeView === 'DUAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: FLAGS & ENGINE SWITCHES ON ONE SIDE (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚩</span>
                <h3 className="font-extrabold text-base text-white">Engine Flags & Master Toggles</h3>
              </div>
              <span className="text-[11px] text-slate-400">Side 1: System Rules</span>
            </div>

            {/* Master Switch Box */}
            <div className="glass-card p-5 rounded-3xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-indigo-200">
                      Master Subscription System
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/40">
                      Master
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Global ON/OFF for all subscription paywalls, banners, and rules.
                  </p>
                </div>

                <button
                  disabled={isUpdatingSettings}
                  onClick={() => handleToggleSetting('subscriptionSystemEnabled', settings.subscriptionSystemEnabled)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    settings.subscriptionSystemEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                      settings.subscriptionSystemEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Master Switch State:</span>
                <span className={`font-extrabold ${settings.subscriptionSystemEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {settings.subscriptionSystemEnabled ? '✓ SYSTEM LIVE (ON)' : '✕ COMPLETELY OFF'}
                </span>
              </div>
            </div>

            {/* Feature Flags Cards */}
            <div className="space-y-3">
              {flagItems.filter((f) => !f.isMaster).map((item) => {
                const isEnabled = settings[item.key];
                const isDisabledMaster = !settings.subscriptionSystemEnabled;

                return (
                  <div
                    key={item.key}
                    className={`glass-card p-4 rounded-2xl border transition-all ${
                      isDisabledMaster
                        ? 'opacity-50 border-slate-800 bg-slate-950/40'
                        : 'border-slate-800/90 hover:border-slate-700 bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                      </div>

                      <button
                        disabled={isUpdatingSettings}
                        onClick={() => handleToggleSetting(item.key, isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Gateways Switches Card */}
            <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">💳</span>
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">Payment Gateway Switches</h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">3 Methods</span>
              </div>

              <div className="space-y-2 pt-1">
                {/* Razorpay */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇮🇳</span>
                    <div>
                      <p className="text-xs font-bold text-white">Razorpay India</p>
                      <p className="text-[10px] text-slate-400">UPI, Cards, NetBanking</p>
                    </div>
                  </div>
                  <button
                    disabled={isUpdatingSettings}
                    onClick={() => handleToggleSetting('razorpayEnabled', settings.razorpayEnabled)}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                      settings.razorpayEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.razorpayEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {/* Stripe */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌐</span>
                    <div>
                      <p className="text-xs font-bold text-white">Stripe Global</p>
                      <p className="text-[10px] text-slate-400">Cards, Apple/Google Pay</p>
                    </div>
                  </div>
                  <button
                    disabled={isUpdatingSettings}
                    onClick={() => handleToggleSetting('stripeEnabled', settings.stripeEnabled)}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                      settings.stripeEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.stripeEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {/* Manual Payment */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <div>
                      <p className="text-xs font-bold text-white">Manual UPI / WhatsApp Proof</p>
                      <p className="text-[10px] text-slate-400">Screenshot review & direct activation</p>
                    </div>
                  </div>
                  <button
                    disabled={isUpdatingSettings}
                    onClick={() => handleToggleSetting('manualPaymentEnabled', settings.manualPaymentEnabled)}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                      settings.manualPaymentEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.manualPaymentEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              {/* WhatsApp Admin Support Input */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Super Admin WhatsApp Payment Support Number:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveWhatsapp}
                    disabled={isUpdatingSettings}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition shrink-0"
                  >
                    Save
                  </button>
                  {whatsappInput && (
                    <a
                      href={`https://wa.me/${whatsappInput.replace(/[^\d+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition shrink-0"
                    >
                      Test
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PLANS & PAYMENTS ON OTHER SIDE (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header with Sub-tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <h3 className="font-extrabold text-base text-white">Plans & Payment Operations</h3>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setDualRightTab('PLANS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    dualRightTab === 'PLANS' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Plans ({cycles.length})
                </button>
                <button
                  onClick={() => setDualRightTab('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    dualRightTab === 'PENDING' ? 'bg-amber-600 text-white shadow' : 'text-amber-400 hover:text-white'
                  }`}
                >
                  <span>Proofs</span>
                  {metrics.pendingVerificationCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                      {metrics.pendingVerificationCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setDualRightTab('GATEWAYS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    dualRightTab === 'GATEWAYS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gateways
                </button>
                <button
                  onClick={() => setDualRightTab('TRANSACTIONS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    dualRightTab === 'TRANSACTIONS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ledger
                </button>
              </div>
            </div>

            {/* TAB CONTENT: PLANS */}
            {dualRightTab === 'PLANS' && (
              <div className="space-y-4">
                <div className="glass-card p-4 rounded-3xl border border-purple-500/30 bg-purple-950/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-white">Active Subscription Plans & Cycles</h4>
                    <p className="text-xs text-slate-400">
                      Dynamic membership durations and INR pricing displayed on mobile & web.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreatePlan}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
                  >
                    <span>➕</span> Add New Plan
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {cycles.map((c) => (
                    <div
                      key={c.id}
                      className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative ${
                        c.isActive
                          ? 'border-purple-500/40 bg-slate-900/70 shadow-lg'
                          : 'border-slate-800 opacity-60 bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            c.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {c.isActive ? '✓ ACTIVE' : '✕ DISABLED'}
                        </span>
                        <span className="text-xs font-bold text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded-lg border border-purple-500/30">
                          {c.durationMonths} Month{c.durationMonths > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-base text-white">{c.name}</h4>
                        <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                          ₹{c.amount.toLocaleString()}
                        </p>
                        {c.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {c.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1">
                        <button
                          disabled={isUpdatingCycle}
                          onClick={() => handleTogglePlanActive(c)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                            c.isActive
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                          }`}
                        >
                          {c.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditPlan(c)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            disabled={isDeletingCycle}
                            onClick={() => handleDeletePlan(c)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[11px] font-bold border border-rose-500/30 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PENDING PROOFS */}
            {dualRightTab === 'PENDING' && (
              <div className="space-y-4">
                <div className="glass-card p-4 rounded-3xl border border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">Pending Verification Queue</h4>
                    <p className="text-xs text-slate-400">
                      Inspect payment screenshots sent by users and activate plans immediately.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs font-mono">
                    {pendingTransactions.length} Pending
                  </span>
                </div>

                {pendingTransactions.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-3xl border border-slate-800 space-y-2">
                    <span className="text-3xl">🎉</span>
                    <h4 className="font-bold text-sm text-white">No Pending Verifications</h4>
                    <p className="text-xs text-slate-400">All manual payments have been reviewed and approved.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">
                                {tx.user?.fullName || 'Business User'}
                              </span>
                              {tx.user?.business?.shopName && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                                  {tx.user.business.shopName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">
                              📱 {tx.user?.mobileNumber || 'N/A'} • Invoice #{tx.invoiceNumber}
                            </p>
                            <p className="text-xs font-extrabold text-emerald-400 font-mono mt-1">
                              Amount: ₹{tx.amount.toLocaleString()} ({tx.cycleName || 'Plan'})
                            </p>
                          </div>

                          {tx.screenshotUrl && (
                            <button
                              onClick={() => setInspectingScreenshot({ url: tx.screenshotUrl!, transaction: tx })}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-1 shrink-0"
                            >
                              <span>🖼️</span> View Receipt
                            </button>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Assign Plan:</span>
                            <select
                              value={selectedCyclesMap[tx.id] || tx.cycleId || cycles[0]?.id || ''}
                              onChange={(e) => setSelectedCyclesMap({ ...selectedCyclesMap, [tx.id]: e.target.value })}
                              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none"
                            >
                              {cycles.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (₹{c.amount.toLocaleString()})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={isApproving}
                              onClick={() => handleApproveTransaction(tx.id, selectedCyclesMap[tx.id] || tx.cycleId || cycles[0]?.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center gap-1"
                            >
                              <span>✓</span> Approve & Activate
                            </button>
                            <button
                              disabled={isRejecting}
                              onClick={() => handleRejectTransaction(tx.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: GATEWAYS */}
            {dualRightTab === 'GATEWAYS' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🇮🇳</span>
                        <h4 className="font-bold text-sm text-white">Razorpay India</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        settings.razorpayEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {settings.razorpayEnabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl">
                      <li>✓ UPI: PhonePe, Google Pay, Paytm</li>
                      <li>✓ Credit & Debit Cards (RuPay, Visa, MC)</li>
                      <li>✓ Corporate Net Banking</li>
                    </ul>
                  </div>

                  <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🌐</span>
                        <h4 className="font-bold text-sm text-white">Stripe Global</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        settings.stripeEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {settings.stripeEnabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl">
                      <li>✓ International Visa, Mastercard, AMEX</li>
                      <li>✓ Apple Pay & Google Pay Mobile</li>
                      <li>✓ SEPA & Direct Bank Mandates</li>
                    </ul>
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📱</span>
                      <div>
                        <h4 className="font-bold text-sm text-white">Manual Direct UPI & WhatsApp</h4>
                        <p className="text-xs text-slate-400">Super Admin WhatsApp Payment Support Line</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      settings.manualPaymentEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {settings.manualPaymentEnabled ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-400">Registered Contact:</span>
                    <span className="font-bold font-mono text-emerald-300">
                      {settings.manualPaymentWhatsapp || 'Not configured'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TRANSACTIONS & LEDGER */}
            {dualRightTab === 'TRANSACTIONS' && (
              <div className="space-y-4">
                <div className="glass-card p-4 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">Recent Transactions & Invoices</h4>
                    <p className="text-xs text-slate-400">Overview of recent payments and GST tax invoices.</p>
                  </div>
                  <button
                    onClick={() => setActiveView('TRANSACTIONS')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition"
                  >
                    Open Full Ledger
                  </button>
                </div>

                <div className="space-y-2">
                  {transactions.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="glass-card p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs gap-3"
                    >
                      <div>
                        <p className="font-bold text-white">{t.user?.fullName || 'Business User'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">#{t.invoiceNumber} • {t.cycleName}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold font-mono text-emerald-400">
                          ₹{t.amount.toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : t.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {t.status}
                        </span>
                        {t.status === 'COMPLETED' && (
                          <button
                            onClick={() => setViewingInvoice(t)}
                            className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow"
                          >
                            Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">No transactions recorded yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FULL-WIDTH VIEW: SUBSCRIPTION PLANS & CYCLES */}
      {activeView === 'PLANS' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-purple-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📦</span>
                <h2 className="font-extrabold text-xl text-white">Dynamic Subscription Plans & Billing Cycles</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Create, edit, toggle, or delete dynamic subscription plans (1 Month, 2 Months, 3 Months, 6 Months, 12 Months, custom durations). Newly created or enabled plans instantly reflect on user payment screens.
              </p>
            </div>

            <button
              onClick={handleOpenCreatePlan}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl transition flex items-center gap-2"
            >
              <span className="text-sm">➕</span>
              <span>Create New Subscription Plan</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {cycles.map((c) => (
              <div
                key={c.id}
                className={`glass-card p-6 rounded-3xl border transition-all space-y-4 relative flex flex-col justify-between ${
                  c.isActive
                    ? 'border-purple-500/40 bg-slate-900/80 shadow-xl'
                    : 'border-slate-800 opacity-60 bg-slate-950/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        c.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {c.isActive ? '✓ ACTIVE' : '✕ DISABLED'}
                    </span>
                    <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-xl border border-purple-500/30">
                      {c.durationMonths} Month{c.durationMonths > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-lg text-white">{c.name}</h3>
                    <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      ₹{c.amount.toLocaleString()}
                    </p>
                    {c.description && (
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                  <button
                    disabled={isUpdatingCycle}
                    onClick={() => handleTogglePlanActive(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      c.isActive
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                    }`}
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditPlan(c)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      disabled={isDeletingCycle}
                      onClick={() => handleDeletePlan(c)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FULL-WIDTH VIEW: PENDING SCREENSHOT VERIFICATIONS */}
      {activeView === 'PENDING' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⏳</span>
                <h2 className="font-extrabold text-xl text-white">Pending Payment Proof Verifications</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Review manual payment screenshots submitted by users. Inspect receipts, select the plan to assign, and activate user subscriptions instantly.
              </p>
            </div>

            <span className="px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs font-mono">
              {pendingTransactions.length} Pending Actions
            </span>
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-3xl border border-slate-800 space-y-3">
              <span className="text-4xl">🎉</span>
              <h3 className="font-bold text-base text-white">All Payment Proofs Verified</h3>
              <p className="text-xs text-slate-400">There are currently no manual payment receipts waiting for review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass-card p-6 rounded-3xl border border-amber-500/30 bg-slate-900/80 space-y-4"
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-extrabold text-base text-white">
                          {tx.user?.fullName || 'Business User'}
                        </h4>
                        {tx.user?.business?.shopName && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                            {tx.user.business.shopName}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                          PENDING VERIFICATION
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                        <p>📱 Mobile: <span className="text-slate-200 font-mono">{tx.user?.mobileNumber || 'N/A'}</span></p>
                        <p>✉️ Email: <span className="text-slate-200">{tx.user?.email || 'N/A'}</span></p>
                        <p>📄 Invoice: <span className="text-slate-200 font-mono">#{tx.invoiceNumber}</span></p>
                        <p>🕒 Date: <span className="text-slate-200">{new Date(tx.createdAt).toLocaleString()}</span></p>
                      </div>

                      <p className="text-lg font-black text-emerald-400 font-mono pt-1">
                        Amount: ₹{tx.amount.toLocaleString()} ({tx.cycleName || 'Plan'})
                      </p>
                    </div>

                    {tx.screenshotUrl && (
                      <button
                        onClick={() => setInspectingScreenshot({ url: tx.screenshotUrl!, transaction: tx })}
                        className="px-4 py-2.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-2 shadow-lg"
                      >
                        <span className="text-base">🖼️</span>
                        <span>Inspect Payment Proof</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-slate-300">Target Subscription Plan:</span>
                      <select
                        value={selectedCyclesMap[tx.id] || tx.cycleId || cycles[0]?.id || ''}
                        onChange={(e) => setSelectedCyclesMap({ ...selectedCyclesMap, [tx.id]: e.target.value })}
                        className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
                      >
                        {cycles.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.durationMonths} Mo - ₹{c.amount.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        disabled={isApproving}
                        onClick={() => handleApproveTransaction(tx.id, selectedCyclesMap[tx.id] || tx.cycleId || cycles[0]?.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Approve & Activate Subscription</span>
                      </button>
                      <button
                        disabled={isRejecting}
                        onClick={() => handleRejectTransaction(tx.id)}
                        className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition"
                      >
                        Reject with Reason
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. FULL-WIDTH VIEW: PAYMENT GATEWAYS & WHATSAPP HUB */}
      {activeView === 'GATEWAYS' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💳</span>
                <h2 className="font-extrabold text-xl text-white">Payment Gateway & Checkout Configuration</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Enable or disable automated payment providers (Razorpay, Stripe) or manual direct UPI transfers with dedicated WhatsApp proof submission.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Razorpay */}
            <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Razorpay India</h3>
                    <p className="text-[11px] text-slate-400">UPI, NetBanking, Cards</p>
                  </div>
                </div>
                <button
                  disabled={isUpdatingSettings}
                  onClick={() => handleToggleSetting('razorpayEnabled', settings.razorpayEnabled)}
                  className={`h-7 w-12 rounded-full p-0.5 transition-colors ${
                    settings.razorpayEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full bg-white transition-transform ${settings.razorpayEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Instant UPI (GPay, PhonePe, Paytm)</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Corporate & Retail Net Banking</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Credit, Debit & Commercial Cards</p>
              </div>
            </div>

            {/* Stripe */}
            <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🌐</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Stripe Global</h3>
                    <p className="text-[11px] text-slate-400">Cards, Apple Pay, SEPA</p>
                  </div>
                </div>
                <button
                  disabled={isUpdatingSettings}
                  onClick={() => handleToggleSetting('stripeEnabled', settings.stripeEnabled)}
                  className={`h-7 w-12 rounded-full p-0.5 transition-colors ${
                    settings.stripeEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full bg-white transition-transform ${settings.stripeEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Global Cards (Visa, MC, AMEX)</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Apple Pay & Google Pay Mobile</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Automated Cross-border Invoicing</p>
              </div>
            </div>

            {/* Manual Payment */}
            <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📱</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Manual UPI & Proof</h3>
                    <p className="text-[11px] text-slate-400">WhatsApp verification</p>
                  </div>
                </div>
                <button
                  disabled={isUpdatingSettings}
                  onClick={() => handleToggleSetting('manualPaymentEnabled', settings.manualPaymentEnabled)}
                  className={`h-7 w-12 rounded-full p-0.5 transition-colors ${
                    settings.manualPaymentEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full bg-white transition-transform ${settings.manualPaymentEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Direct Bank Transfer / QR Scan</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> In-app Screenshot Upload</p>
                <p className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Admin Manual Verification Flow</p>
              </div>
            </div>
          </div>

          {/* WhatsApp Dedicated Configuration */}
          <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h3 className="font-extrabold text-base text-white">Super Admin WhatsApp Payment Support</h3>
                  <p className="text-xs text-slate-400">
                    Users can tap to contact this number directly on WhatsApp when making manual payments or seeking payment assistance.
                  </p>
                </div>
              </div>

              {whatsappInput && (
                <a
                  href={`https://wa.me/${whatsappInput.replace(/[^\d+]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
                >
                  <span>💬</span> Open WhatsApp Chat Test
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 max-w-lg">
              <input
                type="text"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="+91 99999 99999"
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-2xl px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleSaveWhatsapp}
                disabled={isUpdatingSettings}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition"
              >
                Save Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. FULL-WIDTH VIEW: ALL TRANSACTIONS & INVOICES */}
      {activeView === 'TRANSACTIONS' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🧾</span>
                <h2 className="font-extrabold text-xl text-white">Transactions Ledger & Tax Invoices</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Search, filter, inspect payment proofs, and generate GST-compliant tax invoices for all subscribers.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['ALL', 'COMPLETED', 'PENDING_VERIFICATION', 'DUE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Transactions' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by user name, phone, email, or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Subscriber</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {t.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{t.user?.fullName || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{t.user?.mobileNumber || t.user?.email || 'N/A'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono text-emerald-400">
                        ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{t.cycleName}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                        {t.nextDueDate && (
                          <div className="text-[10px] text-amber-400">Due: {new Date(t.nextDueDate).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : t.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {t.screenshotUrl && (
                          <button
                            onClick={() => setInspectingScreenshot({ url: t.screenshotUrl!, transaction: t })}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600/30 text-indigo-300 hover:text-white text-[11px] font-semibold border border-indigo-500/30"
                          >
                            🖼️ Proof
                          </button>
                        )}
                        {t.status === 'COMPLETED' && (
                          <button
                            onClick={() => setViewingInvoice(t)}
                            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow transition"
                          >
                            📄 Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. FULL-WIDTH VIEW: ALL ENGINE FLAGS */}
      {activeView === 'FLAGS' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🚩</span>
                <h2 className="font-extrabold text-xl text-white">Complete Subscription Engine Feature Switches</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Full-width view of all 10 system rules, master controls, gateway authorizations, and paywall behaviors.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {flagItems.map((item) => {
              const isEnabled = settings[item.key];
              const isDisabledMaster = !settings.subscriptionSystemEnabled && !item.isMaster;

              return (
                <div
                  key={item.key}
                  className={`glass-card p-6 rounded-3xl border transition-all ${
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
                        <h3 className={`font-bold ${item.isMaster ? 'text-indigo-300 text-base' : 'text-white text-sm'}`}>
                          {item.title}
                        </h3>
                        {item.isMaster && (
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase">
                            Master Control
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-lg">{item.desc}</p>
                    </div>

                    <button
                      disabled={isUpdatingSettings}
                      onClick={() => handleToggleSetting(item.key, isEnabled)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. CREATE / EDIT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleSubmitPlanForm}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>📦</span>
                <span>{editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Plan Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 Month Plan, 3 Months Quarterly, Annual Pro"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Months):</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={planForm.durationMonths}
                    onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price Amount (INR):</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planForm.amount}
                    onChange={(e) => setPlanForm({ ...planForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Plan Description / Features:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Full B2B platform access, unlimited catalog listings, verified badge"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="planActiveCheckbox"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <label htmlFor="planActiveCheckbox" className="text-slate-300 font-semibold cursor-pointer">
                  Active (Immediately live on user payment screen)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingCycle || isUpdatingCycle}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg"
              >
                {editingPlan ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10. LIGHTBOX MODAL FOR SCREENSHOT VERIFICATION */}
      {inspectingScreenshot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-left">
                <h3 className="font-bold text-base text-white">Payment Screenshot Verification</h3>
                <p className="text-xs text-slate-400">
                  Subscriber: {inspectingScreenshot.transaction.user?.fullName} (Invoice #{inspectingScreenshot.transaction.invoiceNumber})
                </p>
              </div>
              <button
                onClick={() => setInspectingScreenshot(null)}
                className="text-slate-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-2 flex items-center justify-center">
              <img
                src={inspectingScreenshot.url}
                alt="Payment Receipt Proof"
                className="max-w-full max-h-[55vh] rounded-xl object-contain shadow"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-3 flex-wrap">
              <button
                onClick={() => setInspectingScreenshot(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Close Viewer
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={isApproving}
                  onClick={() => handleApproveTransaction(inspectingScreenshot.transaction.id, inspectingScreenshot.transaction.cycleId || cycles[0]?.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
                >
                  <span>✓</span> Approve Payment
                </button>
                <button
                  disabled={isRejecting}
                  onClick={() => handleRejectTransaction(inspectingScreenshot.transaction.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/30"
                >
                  Reject Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. INVOICE MODAL VIEWER */}
      <InvoiceModal transaction={viewingInvoice} onClose={() => setViewingInvoice(null)} />
    </div>
  );
}
