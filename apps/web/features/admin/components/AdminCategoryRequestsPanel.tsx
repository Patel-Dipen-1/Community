'use client';

import React, { useState } from 'react';
import {
  useGetCategoryRequestsQuery,
  useGetGlobalOptionsQuery,
  useApproveCategoryRequestMutation,
  useRejectCategoryRequestMutation,
  useDeleteCategoryRequestMutation,
  useCreateAdminCategoryOptionMutation,
  useUpdateCategoryOptionMutation,
  CategoryRequestData,
} from '../../../lib/redux/api/productsApi';

const SPEC_GROUPS: { typeKey: string; label: string; icon: string; category: string }[] = [
  { typeKey: 'JEWELLERY_PURITY', label: 'Jewellery Purities', icon: '💎', category: 'Jewellery Community' },
  { typeKey: 'JEWELLERY_GEMSTONE', label: 'Jewellery Gemstones', icon: '✨', category: 'Jewellery Community' },
  { typeKey: 'JEWELLERY_CERT', label: 'Jewellery Certifications', icon: '📜', category: 'Jewellery Community' },
  { typeKey: 'FABRIC', label: 'Fabric Types', icon: '👕', category: 'Clothing Community' },
  { typeKey: 'GENDER', label: 'Target Gender / Age', icon: '👥', category: 'Clothing Community' },
  { typeKey: 'FIT', label: 'Fit Types', icon: '✂️', category: 'Clothing Community' },
  { typeKey: 'SEASON', label: 'Season / Occasion', icon: '🗓️', category: 'Clothing Community' },
  { typeKey: 'SIZE', label: 'Sizes', icon: '📏', category: 'Clothing Community' },
  { typeKey: 'PATTERN', label: 'Patterns & Work', icon: '🎨', category: 'Clothing Community' },
  { typeKey: 'CATEGORY_CLOTHING', label: 'Clothing Categories', icon: '👔', category: 'Clothing Community' },
  { typeKey: 'HARDWARE_MATERIAL', label: 'Hardware Materials', icon: '🔩', category: 'Hardware Community' },
  { typeKey: 'HARDWARE_WARRANTY', label: 'Hardware Warranties', icon: '🛡️', category: 'Hardware Community' },
  { typeKey: 'HARDWARE_POWER', label: 'Power Ratings', icon: '⚡', category: 'Hardware Community' },
  { typeKey: 'HARDWARE_FINISH', label: 'Finishes', icon: '✨', category: 'Hardware Community' },
  { typeKey: 'HARDWARE_APPLICATION', label: 'Applications', icon: '🏗️', category: 'Hardware Community' },
  { typeKey: 'CATEGORY_HARDWARE', label: 'Hardware Categories', icon: '🔧', category: 'Hardware Community' },
  { typeKey: 'ELEC_POWER', label: 'Power Sources', icon: '🔋', category: 'Electronics Community' },
  { typeKey: 'ELEC_CONN', label: 'Connectivity Types', icon: '📡', category: 'Electronics Community' },
  { typeKey: 'ELEC_WARRANTY', label: 'Electronics Warranties', icon: '🏷️', category: 'Electronics Community' },
  { typeKey: 'CATEGORY_ELECTRONICS', label: 'Electronics Categories', icon: '💻', category: 'Electronics Community' },
  { typeKey: 'GROCERY_PACK', label: 'Packaging Types', icon: '📦', category: 'Grocery Community' },
  { typeKey: 'GROCERY_SHELF', label: 'Shelf Life Options', icon: '⏳', category: 'Grocery Community' },
  { typeKey: 'GROCERY_CERT', label: 'Grocery Certifications', icon: '🌱', category: 'Grocery Community' },
  { typeKey: 'CATEGORY_GROCERY', label: 'Grocery Categories', icon: '🌾', category: 'Grocery Community' },
];

export function AdminCategoryRequestsPanel() {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'HIERARCHY'>('REQUESTS');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  // Reclassify / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'APPROVE_RECLASSIFY' | 'EDIT' | 'CREATE'>('APPROVE_RECLASSIFY');
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequestData | null>(null);
  const [formType, setFormType] = useState('FABRIC');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Redux RTK Queries & Mutations
  const { data: requests, isLoading: isRequestsLoading, refetch: refetchRequests } = useGetCategoryRequestsQuery(
    statusFilter === 'ALL' ? undefined : { status: statusFilter }
  );
  const { data: globalOptions, refetch: refetchGlobalOptions } = useGetGlobalOptionsQuery();

  const [approveRequest, { isLoading: isApproving }] = useApproveCategoryRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectCategoryRequestMutation();
  const [deleteRequest, { isLoading: isDeleting }] = useDeleteCategoryRequestMutation();
  const [createOption, { isLoading: isCreatingOption }] = useCreateAdminCategoryOptionMutation();
  const [updateOption, { isLoading: isUpdatingOption }] = useUpdateCategoryOptionMutation();

  const showNotification = (message: string) => {
    setMsg(message);
    setTimeout(() => setMsg(null), 4500);
  };

  const handleRefetchAll = () => {
    refetchRequests();
    refetchGlobalOptions();
  };

  // Open Modal to Approve & Optionally Reclassify Request
  const openApproveModal = (req: CategoryRequestData) => {
    setSelectedRequest(req);
    setFormType(req.type);
    setCustomTypeInput('');
    setFormValue(req.value);
    setFormDescription(req.description || '');
    setModalMode('APPROVE_RECLASSIFY');
    setIsModalOpen(true);
  };

  // Open Modal to Edit Existing Option
  const openEditModal = (req: CategoryRequestData) => {
    setSelectedRequest(req);
    setFormType(req.type);
    setCustomTypeInput('');
    setFormValue(req.value);
    setFormDescription(req.description || '');
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  // Open Modal to Create New Option directly
  const openCreateModal = (defaultTypeKey: string = 'FABRIC') => {
    setSelectedRequest(null);
    setFormType(defaultTypeKey);
    setCustomTypeInput('');
    setFormValue('');
    setFormDescription('');
    setModalMode('CREATE');
    setIsModalOpen(true);
  };

  // Save Modal Action
  const handleSaveModal = async () => {
    const finalType = (formType === 'CUSTOM' ? customTypeInput : formType).trim().toUpperCase();
    if (!finalType) {
      alert('Specification Title / Group Type is required');
      return;
    }
    if (!formValue.trim()) {
      alert('Option Value text is required');
      return;
    }

    try {
      if (modalMode === 'APPROVE_RECLASSIFY' && selectedRequest) {
        await approveRequest({
          id: selectedRequest.id,
          type: finalType,
          value: formValue.trim(),
        }).unwrap();
        showNotification(`✅ Approved & Reclassified '${formValue.trim()}' under ${finalType}! It is now live for all users.`);
      } else if (modalMode === 'EDIT' && selectedRequest) {
        await updateOption({
          id: selectedRequest.id,
          type: finalType,
          value: formValue.trim(),
        }).unwrap();
        showNotification(`✏️ Updated specification option to '${formValue.trim()}' (${finalType}) globally!`);
      } else if (modalMode === 'CREATE') {
        await createOption({
          type: finalType,
          value: formValue.trim(),
          description: formDescription.trim() || undefined,
        }).unwrap();
        showNotification(`🎉 Added new option '${formValue.trim()}' to ${finalType} globally!`);
      }

      setIsModalOpen(false);
      handleRefetchAll();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Action failed');
    }
  };

  const handleQuickApprove = async (req: CategoryRequestData) => {
    try {
      await approveRequest(req.id).unwrap();
      showNotification(`✅ Approved '${req.value}' (${req.type})! Available globally.`);
      handleRefetchAll();
    } catch (err: any) {
      showNotification(`❌ ${err?.data?.error || err?.message || 'Failed to approve request'}`);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason for this request:');
    if (reason === null) return;

    try {
      await rejectRequest({ id, reason }).unwrap();
      showNotification('❌ Request rejected.');
      handleRefetchAll();
    } catch (err: any) {
      showNotification(`❌ ${err?.data?.error || err?.message || 'Failed to reject request'}`);
    }
  };

  const handleDelete = async (idOrVal: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'? This soft-deletes it from global dropdowns.`)) return;

    try {
      await deleteRequest(idOrVal).unwrap();
      showNotification(`🗑️ Option '${name}' soft-deleted.`);
      handleRefetchAll();
    } catch (err: any) {
      showNotification(`❌ ${err?.data?.error || err?.message || 'Failed to delete option'}`);
    }
  };

  const filteredRequests = (requests || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.value.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (r.user?.fullName && r.user.fullName.toLowerCase().includes(q)) ||
      (r.user?.mobileNumber && r.user.mobileNumber.toLowerCase().includes(q)) ||
      (r.user?.business?.shopName && r.user.business.shopName.toLowerCase().includes(q))
    );
  });

  const pendingCount = (requests || []).filter((r) => r.status === 'PENDING').length;
  const approvedCount = (requests || []).filter((r) => r.status === 'APPROVED').length;

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'JEWELLERY_PURITY':
      case 'JEWELLERY_GEMSTONE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'CATEGORY':
      case 'CATEGORY_CLOTHING':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'FABRIC':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'GENDER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'FIT':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'SEASON':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'SIZE':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'HARDWARE_MATERIAL':
      case 'CATEGORY_HARDWARE':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Helper to get active global options by type key from globalOptions
  const getGlobalValuesForGroup = (typeKey: string): string[] => {
    if (!globalOptions) return [];
    switch (typeKey) {
      case 'JEWELLERY_PURITY': return globalOptions.jewelleryPurities || [];
      case 'JEWELLERY_GEMSTONE': return globalOptions.jewelleryGemstones || [];
      case 'JEWELLERY_CERT': return globalOptions.jewelleryCertifications || [];
      case 'FABRIC': return globalOptions.fabrics || [];
      case 'GENDER': return globalOptions.genders || [];
      case 'FIT': return globalOptions.fitTypes || [];
      case 'SEASON': return globalOptions.seasons || [];
      case 'SIZE': return globalOptions.sizes || [];
      case 'PATTERN': return globalOptions.patterns || [];
      case 'CATEGORY_CLOTHING': return globalOptions.clothingCategories || [];
      case 'HARDWARE_MATERIAL': return globalOptions.hardwareMaterials || [];
      case 'HARDWARE_WARRANTY': return globalOptions.hardwareWarranties || [];
      case 'HARDWARE_POWER': return globalOptions.hardwarePowerRatings || [];
      case 'HARDWARE_FINISH': return globalOptions.hardwareFinishes || [];
      case 'HARDWARE_APPLICATION': return globalOptions.hardwareApplications || [];
      case 'CATEGORY_HARDWARE': return globalOptions.hardwareCategories || [];
      case 'ELEC_POWER': return globalOptions.electronicsPowerSources || [];
      case 'ELEC_CONN': return globalOptions.electronicsConnectivities || [];
      case 'ELEC_WARRANTY': return globalOptions.electronicsWarranties || [];
      case 'CATEGORY_ELECTRONICS': return globalOptions.electronicsCategories || [];
      case 'GROCERY_PACK': return globalOptions.groceryPackagings || [];
      case 'GROCERY_SHELF': return globalOptions.groceryShelfLives || [];
      case 'GROCERY_CERT': return globalOptions.groceryCertifications || [];
      case 'CATEGORY_GROCERY': return globalOptions.groceryCategories || [];
      default: return [];
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏷️</span>
            <h2 className="font-extrabold text-xl text-white">Dynamic Category & Specification Management</h2>
          </div>
          <p className="text-xs text-slate-400">
            Super Admin center to review vendor requests, reclassify specification attributes, and manage all category specification options across Jewellery, Clothing, Hardware, Electronics & Grocery.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⏳ Pending Queue & History</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('HIERARCHY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'HIERARCHY'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌳 Category & Spec Hierarchy</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* VIEW 1: REQUESTS QUEUE & TABLE */}
      {activeTab === 'REQUESTS' && (
        <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  {statusFilter === 'PENDING'
                    ? '⏳ Vendor Custom Request Approval Queue'
                    : statusFilter === 'APPROVED'
                    ? '✓ Approved Active Options'
                    : statusFilter === 'REJECTED'
                    ? '✕ Rejected Requests'
                    : '📋 All Specification Requests'}
                </h3>
                <p className="text-xs text-slate-400">
                  {filteredRequests.length} record(s) matching filter.
                </p>
              </div>

              <div className="flex items-center gap-1.5 ml-4">
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'APPROVED'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white'
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('REJECTED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-white'
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search value, group type, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs w-64 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => openCreateModal('FABRIC')}
                disabled={isCreatingOption}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <span>➕ Add Option</span>
              </button>
            </div>
          </div>

          {isRequestsLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
              Loading requests queue...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No requests found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Group Type</th>
                    <th className="py-3 px-3">Requested Sub-Option Value</th>
                    <th className="py-3 px-3">Vendor / Requester</th>
                    <th className="py-3 px-3">Requested At</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition">
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
                        <div className="font-bold text-white">{r.user?.fullName || 'System Admin'}</div>
                        <div className="text-[11px] text-emerald-400 font-mono font-semibold">
                          📱 {r.user?.mobileNumber || 'Global'} {r.user?.business?.shopName ? `• ${r.user.business.shopName}` : ''}
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
                      <td className="py-3.5 px-3 text-right space-x-1.5">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              disabled={isApproving}
                              onClick={() => handleQuickApprove(r)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow transition"
                              title="Quick approve as-is"
                            >
                              ✓ Approve
                            </button>
                            <button
                              disabled={isApproving}
                              onClick={() => openApproveModal(r)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                              title="Reclassify group/type & approve"
                            >
                              ✏️ Reclassify & Approve
                            </button>
                            <button
                              disabled={isRejecting}
                              onClick={() => handleReject(r.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {r.status !== 'PENDING' && (
                          <button
                            disabled={isUpdatingOption}
                            onClick={() => openEditModal(r)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition"
                            title="Edit value or reclassify group"
                          >
                            ✏️ Edit / Reclassify
                          </button>
                        )}

                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(r.id, r.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition"
                          title="Soft delete option"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CATEGORY & SPECIFICATION HIERARCHY TREE */}
      {activeTab === 'HIERARCHY' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-white">Master Category & Specification Attributes</h3>
              <p className="text-xs text-slate-400">
                Manage specification options organized by Specification Title / Key. Click '➕ Add Sub-Option' to add values to any title, or click '✏️ Edit' / '🗑️ Delete' on any option badge.
              </p>
            </div>
            <button
              onClick={() => openCreateModal('FABRIC')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-2"
            >
              <span>➕ Add Specification Title / Option</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SPEC_GROUPS.map((group) => {
              const activeValues = getGlobalValuesForGroup(group.typeKey);
              const customDbRequestsForGroup = (requests || []).filter(
                (r) => r.type === group.typeKey && r.status === 'APPROVED'
              );

              return (
                <div key={group.typeKey} className="glass-card p-5 rounded-2xl border-slate-800 space-y-4 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-2 rounded-xl bg-slate-900 border border-slate-800">{group.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{group.label}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                            {group.typeKey}
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-400 font-semibold">{group.category}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openCreateModal(group.typeKey)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-1"
                    >
                      <span>➕ Add Option</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeValues.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No active options for this specification.</span>
                    ) : (
                      activeValues.map((val) => {
                        const matchingReq = customDbRequestsForGroup.find(
                          (r) => r.value.trim().toLowerCase() === val.trim().toLowerCase()
                        );

                        return (
                          <div
                            key={val}
                            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 hover:border-indigo-500 transition group"
                          >
                            <span>{val}</span>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  matchingReq
                                    ? openEditModal(matchingReq)
                                    : openEditModal({ id: val, type: group.typeKey, value: val, status: 'APPROVED', createdAt: '' } as any)
                                }
                                className="text-slate-400 hover:text-indigo-400 p-0.5 text-[11px]"
                                title="Edit option"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(matchingReq ? matchingReq.id : val, val)}
                                className="text-slate-400 hover:text-rose-400 p-0.5 text-[11px]"
                                title="Delete option"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INTERACTIVE MODAL FOR CREATING, EDITING & RECLASSIFYING OPTIONS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border-indigo-500/40 space-y-5 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>
                  {modalMode === 'APPROVE_RECLASSIFY'
                    ? '✏️ Reclassify Group & Approve Request'
                    : modalMode === 'EDIT'
                    ? '✏️ Edit Specification Option'
                    : '➕ Add New Specification Option'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {selectedRequest && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">
                  Requested by:{' '}
                  <span className="font-bold text-white">
                    {selectedRequest.user?.fullName || 'Vendor'} ({selectedRequest.user?.mobileNumber || 'Mobile'})
                  </span>
                </div>
                <div className="text-slate-400">
                  Original Submitted Type: <span className="font-bold text-amber-400">{selectedRequest.type}</span>
                </div>
                <div className="text-slate-400">
                  Original Submitted Value: <span className="font-bold text-white">{selectedRequest.value}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Target Specification Title / Group */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Select Target Specification Title / Group Key
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {SPEC_GROUPS.map((g) => (
                    <option key={g.typeKey} value={g.typeKey}>
                      {g.icon} {g.label} ({g.typeKey}) — {g.category}
                    </option>
                  ))}
                  <option value="CUSTOM">➕ Create Custom Specification Group Title...</option>
                </select>
              </div>

              {formType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Enter Custom Group Key (e.g. HARDWARE_BRAND, GOLD_KARAT)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. CUSTOM_SPEC_KEY"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-amber-500/50 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* Sub-Option Value */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Sub-Option Value Text (e.g. 24K Pure Gold (999), 100% Combed Cotton, 5XL)
                </label>
                <input
                  type="text"
                  placeholder="Enter option value..."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Optional Description / Notes
                </label>
                <input
                  type="text"
                  placeholder="Internal note for Super Admin..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={isApproving || isUpdatingOption || isCreatingOption}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg transition flex items-center gap-2"
              >
                <span>
                  {modalMode === 'APPROVE_RECLASSIFY'
                    ? '✓ Reclassify & Approve Live'
                    : modalMode === 'EDIT'
                    ? '💾 Save Option'
                    : '➕ Create Option Live'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
