'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useGetMyInquiriesQuery,
  useUpdateInquiryStatusMutation,
  useClickLeadMutation,
  useAdminManageLeadMutation,
  InquiryItem,
} from '../../lib/redux/api/leadsApi';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { WhatsAppLayout } from '../../components/layout/WhatsAppLayout';
import { useToast } from '../../components/common/Toast';
import { RichProductSkuCard } from '../products/components/RichProductSkuCard';
import { ProductDetail } from '../products/components/ProductDetail';

export function InquiryModule() {
  const router = useRouter();
  const { addToast } = useToast();
  const { data: profileData } = useGetProfileQuery();
  const user = profileData?.user;

  const { data: inquiryData, isLoading, isError, refetch } = useGetMyInquiriesQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateInquiryStatusMutation();
  const [clickLead] = useClickLeadMutation();
  const [adminManageLead, { isLoading: isManaging }] = useAdminManageLeadMutation();

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'CONTACTED' | 'COMPLETED' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Super Admin Lead Rule Management Modal State
  const [editingLeadRules, setEditingLeadRules] = useState<InquiryItem | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);
  const [ruleFormCategory, setRuleFormCategory] = useState<string>('clothing');
  const [ruleFormBatchSize, setRuleFormBatchSize] = useState<number>(10);
  const [ruleFormStatus, setRuleFormStatus] = useState<string>('ACTIVE');

  const inquiries = inquiryData?.leads || [];
  const isSuperAdmin = inquiryData?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.email === 'dnpatel2002@gmail.com';
  const userCategories = inquiryData?.userCategories || ['clothing'];

  // Handle Recipient Vendor Click (Rule 9: Batch Rotation on 10 Clicks)
  const handleRecipientClickLead = async (inq: InquiryItem, actionType: 'chat' | 'call') => {
    try {
      await clickLead(inq.id).unwrap();
    } catch {
      // Ignore background click tracking errors
    }

    if (actionType === 'chat') {
      router.push(`/chat?mobile=${encodeURIComponent(inq.mobileNumber)}${inq.productCode ? `&productCode=${encodeURIComponent(inq.productCode)}` : ''}`);
    } else {
      window.location.href = `tel:${inq.mobileNumber}`;
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      addToast(`Inquiry status updated to ${newStatus}`, 'success');
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || 'Failed to update status'}`, 'error');
    }
  };

  const handleOpenAdminRulesModal = (inq: InquiryItem) => {
    setEditingLeadRules(inq);
    setRuleFormCategory(inq.targetCategory || 'clothing');
    setRuleFormBatchSize(inq.batchSize || 10);
    setRuleFormStatus(inq.status || 'ACTIVE');
  };

  const handleSaveAdminRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeadRules) return;

    try {
      await adminManageLead({
        id: editingLeadRules.id,
        payload: {
          targetCategory: ruleFormCategory,
          batchSize: Number(ruleFormBatchSize),
          status: ruleFormStatus,
        },
      }).unwrap();

      addToast('🛡️ Lead distribution rules & category batch updated successfully!', 'success');
      setEditingLeadRules(null);
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || 'Failed to update lead rules'}`, 'error');
    }
  };

  const filteredInquiries = inquiries.filter((inq: InquiryItem) => {
    const matchesStatus = filterStatus === 'ALL' || inq.status === filterStatus;
    const matchesCategory = categoryFilter === 'ALL' || (inq.targetCategory || '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      inq.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.mobileNumber.includes(searchQuery) ||
      (inq.productCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.targetCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.message || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <WhatsAppLayout activeTab="settings">
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col h-full overflow-y-auto">
        {/* Top Header */}
        <header className="p-4 md:p-6 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-600/20">
              📞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-extrabold text-white">
                  Targeted Trade Leads & Inquiries
                </h1>
                {isSuperAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    🛡️ Super Admin Rule Control
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    🏷️ Categories: {userCategories.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSuperAdmin
                  ? 'Manage all platform trade leads, category targeting, recipient batches & click thresholds'
                  : 'Receive targeted wholesale inquiries matching your assigned category access in batches of 10'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Rules Banner Info */}
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="text-emerald-400 text-xl font-bold mt-0.5">⚙️</div>
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-emerald-300 block">Category-Targeted Batching Engine</span>
              <p className="text-slate-300 leading-relaxed">
                • <strong>Rules 1-7:</strong> Only approved vendors create leads. Leads are automatically targeted strictly to vendors with matching category access.<br />
                • <strong>Rules 8-9:</strong> Distributed in <strong>batches of 10 targeted vendors</strong>. After 10 vendor clicks, the batch automatically rotates to the next eligible 10 category members.
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by buyer name, phone, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 text-emerald-400 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              <option value="clothing">👕 Clothing</option>
              <option value="jewellery">💎 Jewellery</option>
              <option value="electronics">📱 Electronics</option>
              <option value="footwear">👟 Footwear</option>
              <option value="textiles">🧵 Textiles</option>
              <option value="cosmetics">💄 Cosmetics</option>
              <option value="hardware">🔧 Hardware</option>
            </select>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'ACTIVE', 'CONTACTED', 'COMPLETED', 'CLOSED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filterStatus === tab
                      ? 'bg-emerald-600 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? `All (${inquiries.length})` : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Inquiries List Cards */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Loading targeted trade leads...
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
              Failed to load trade leads. Please check your network or sign in again.
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="p-12 text-center glass-card rounded-3xl border-slate-800 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto">
                📥
              </div>
              <h3 className="font-bold text-base text-white">No Targeted Trade Leads Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Targeted inquiries for your category will automatically appear here in batches of 10 eligible vendors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInquiries.map((inq: InquiryItem) => {
                const isActive = inq.status === 'ACTIVE';
                const isContacted = inq.status === 'CONTACTED';
                const isCompleted = inq.status === 'COMPLETED';
                const isClosed = inq.status === 'CLOSED';

                const categoryName = (inq.targetCategory || 'clothing').toUpperCase();
                const clickCount = inq.clickedUserIds?.length || 0;
                const batchSize = inq.batchSize || 10;

                return (
                  <div
                    key={inq.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl transition relative overflow-hidden"
                  >
                    {/* Category Ribbon */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          🏷️ {categoryName}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300">
                          Batch #{inq.currentBatch || 1}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold tracking-wider ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : isContacted
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : isCompleted
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>

                    {/* Buyer Information Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md">
                        {inq.visitorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white">{inq.visitorName}</h3>
                        <p className="text-xs text-emerald-400 font-mono font-semibold">
                          📱 {inq.mobileNumber}
                        </p>
                      </div>
                    </div>

                    {/* Middle Details & Batch Stats Box */}
                    <div className="space-y-2 text-xs">
                      {inq.productCode && (
                        <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800">
                          <RichProductSkuCard
                            productCode={inq.productCode}
                            onOpenDetails={(prod) => setSelectedProductForDetail(prod)}
                          />
                        </div>
                      )}

                      {inq.quantity && inq.quantity > 1 && (
                        <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400">Required Quantity:</span>
                          <span className="font-bold text-white">{inq.quantity} Pcs</span>
                        </div>
                      )}

                      {inq.message && (
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block font-bold uppercase mb-1">
                            Trade Lead Message / Notes:
                          </span>
                          <p className="text-slate-200 text-xs italic leading-relaxed">
                            "{inq.message}"
                          </p>
                        </div>
                      )}

                      {/* Rule 8 & 9: Batch Progress & Click Counters */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-semibold">Batch Engagement (10 Max):</span>
                          <span className="font-extrabold text-emerald-400 font-mono">
                            {clickCount} / {batchSize} Clicks
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, (clickCount / batchSize) * 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Targeted Category: {categoryName}</span>
                          <span>Total Clicks: {inq.totalClicks || 0}</span>
                        </div>
                      </div>

                      {/* Super Admin Detailed Recipient Breakdown */}
                      {isSuperAdmin && (
                        <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl text-[11px] space-y-2">
                          <div className="flex justify-between items-center border-b border-purple-800/40 pb-1.5">
                            <span className="font-bold text-purple-300">🛡️ Super Admin Rule Controls</span>
                            <button
                              onClick={() => handleOpenAdminRulesModal(inq)}
                              className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px]"
                            >
                              ⚙️ Edit Lead Rules
                            </button>
                          </div>

                          <div>
                            <span className="text-slate-400 block mb-1">
                              Targeted Category Members in Batch #{inq.currentBatch} ({inq.assignedUsers?.length || 0}):
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                              {inq.assignedUsers?.map((u) => (
                                <span key={u.id} className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-200 border border-slate-800">
                                  {u.fullName} ({u.mobileNumber})
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 text-right">
                        Created: {new Date(inq.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Direct Chat Button with Click Tracking */}
                        <button
                          onClick={() => handleRecipientClickLead(inq, 'chat')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow flex items-center gap-1 transition"
                        >
                          💬 Chat & Receive Lead
                        </button>

                        {/* Phone Call Trigger with Click Tracking */}
                        <button
                          onClick={() => handleRecipientClickLead(inq, 'call')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center gap-1"
                        >
                          📞 Call Buyer
                        </button>
                      </div>

                      {/* Status Toggle Actions */}
                      <div className="flex items-center gap-1 text-[11px]">
                        {!isContacted && (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'CONTACTED')}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 font-bold border border-teal-500/20"
                          >
                            Mark Contacted
                          </button>
                        )}
                        {!isClosed ? (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'CLOSED')}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white font-bold"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'ACTIVE')}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold"
                          >
                            Re-activate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL: SUPER ADMIN LEAD RULES & BATCH MANAGEMENT (Rule 10) */}
        {editingLeadRules && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>🛡️</span> Manage Lead Distribution Rules & Batches
                </h3>
                <button
                  onClick={() => setEditingLeadRules(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAdminRules} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Category *</label>
                  <select
                    value={ruleFormCategory}
                    onChange={(e) => setRuleFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
                  >
                    <option value="clothing">👕 Clothing</option>
                    <option value="jewellery">💎 Jewellery</option>
                    <option value="electronics">📱 Electronics</option>
                    <option value="footwear">👟 Footwear</option>
                    <option value="textiles">🧵 Textiles</option>
                    <option value="cosmetics">💄 Cosmetics</option>
                    <option value="hardware">🔧 Hardware</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Batch Size</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={ruleFormBatchSize}
                      onChange={(e) => setRuleFormBatchSize(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Lead Status</label>
                    <select
                      value={ruleFormStatus}
                      onChange={(e) => setRuleFormStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-1 text-[11px] text-purple-200">
                  <p className="font-bold">Super Admin Override Rules:</p>
                  <p className="text-slate-300">
                    Changing category will re-target the lead to eligible members of that category. Saving will refresh batch distribution.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingLeadRules(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isManaging}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition"
                  >
                    {isManaging ? 'Saving...' : 'Save Lead Rules'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Details Full Screen Modal Popup */}
        {selectedProductForDetail && (
          <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start justify-center">
            <div className="w-full max-w-4xl relative my-auto">
              <ProductDetail
                initialProduct={selectedProductForDetail}
                onClose={() => setSelectedProductForDetail(null)}
              />
            </div>
          </div>
        )}
      </div>
    </WhatsAppLayout>
  );
}
