'use client';

import React, { useState } from 'react';
import {
  useGetCategoryRequestsQuery,
  useApproveCategoryRequestMutation,
  useRejectCategoryRequestMutation,
  CategoryRequestData,
} from '../../../lib/redux/api/productsApi';

export function AdminCategoryRequestsPanel() {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const { data: requests, isLoading, refetch } = useGetCategoryRequestsQuery(
    statusFilter === 'ALL' ? undefined : { status: statusFilter }
  );

  const [approveRequest, { isLoading: isApproving }] = useApproveCategoryRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectCategoryRequestMutation();

  const handleApprove = async (id: string, value: string, type: string) => {
    try {
      await approveRequest(id).unwrap();
      setMsg(`✅ Approved '${value}' (${type})! It is now automatically added globally for all users across the platform.`);
      refetch();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to approve request'}`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason for this category/attribute request:');
    if (reason === null) return;

    try {
      await rejectRequest({ id, reason }).unwrap();
      setMsg('❌ Request rejected.');
      refetch();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to reject request'}`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const filteredRequests = (requests || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.value.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.user?.fullName.toLowerCase().includes(q) ||
      r.user?.mobileNumber.toLowerCase().includes(q) ||
      (r.user?.business?.shopName && r.user.business.shopName.toLowerCase().includes(q))
    );
  });

  const pendingCount = (requests || []).filter((r) => r.status === 'PENDING').length;
  const approvedCount = (requests || []).filter((r) => r.status === 'APPROVED').length;

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'CATEGORY':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'FABRIC':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'GENDER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'FIT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'SEASON':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'SIZE':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏷️</span>
            <h2 className="font-extrabold text-xl text-white">Custom Category & Specification Attribute Approvals</h2>
          </div>
          <p className="text-xs text-slate-400">
            Review user requests for custom product Categories, Fabric Types, Target Genders, Fit Types, Seasons, and Sizes. Approving automatically makes them available globally for everyone.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white'
            }`}
          >
            <span>⏳ Pending Requests</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-950 text-[10px] font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white'
            }`}
          >
            ✓ Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-white'
            }`}
          >
            ✕ Rejected
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white">
              {statusFilter === 'PENDING'
                ? '⏳ Pending Category & Attribute Approval Queue'
                : statusFilter === 'APPROVED'
                ? '✓ Approved Global Options'
                : statusFilter === 'REJECTED'
                ? '✕ Rejected Custom Requests'
                : '📋 All Custom Option Requests'}
            </h3>
            <p className="text-xs text-slate-400">
              {filteredRequests.length} request(s) found.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search request value, user, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs w-64"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading category & attribute requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No category or attribute requests found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Requested Value</th>
                  <th className="py-3 px-3">Requesting User / Business</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${getTypeBadgeStyle(r.type)}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-white text-sm">
                      {r.value}
                      {r.description && (
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{r.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white">{r.user?.fullName || 'User'}</div>
                      <div className="text-[11px] text-emerald-400 font-mono font-semibold">
                        📱 {r.user?.mobileNumber || 'N/A'} {r.user?.business?.shopName ? `• ${r.user.business.shopName}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : r.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.rejectionReason && (
                        <p className="text-[10px] text-rose-400 italic mt-0.5">{r.rejectionReason}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            disabled={isApproving}
                            onClick={() => handleApprove(r.id, r.value, r.type)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow transition"
                          >
                            ✓ Approve & Add Globally
                          </button>
                          <button
                            disabled={isRejecting}
                            onClick={() => handleReject(r.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {r.status === 'APPROVED' && (
                        <span className="text-[11px] text-emerald-400 font-bold">
                          ✓ Available Globally
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
