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
  useGetCommunitiesQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useDeleteCommunityMutation,
  CategoryRequestData,
} from '../../../lib/redux/api/productsApi';

interface SpecDef {
  typeKey: string;
  label: string;
  icon: string;
}

interface CommunitySection {
  communityId: string;
  communityName: string;
  icon: string;
  description: string;
  specs: SpecDef[];
}

const COMMUNITY_SECTIONS: CommunitySection[] = [
  {
    communityId: 'clothing',
    communityName: '👕 Clothing & Textiles Community',
    icon: '👕',
    description: 'Categories, Sizes, Fit Types, Fabric Types, Target Genders, Seasons & Patterns.',
    specs: [
      { typeKey: 'CATEGORY_CLOTHING', label: 'Clothing Categories', icon: '👔' },
      { typeKey: 'SIZE', label: 'Sizes', icon: '📏' },
      { typeKey: 'FIT', label: 'Fit Types', icon: '✂️' },
      { typeKey: 'FABRIC', label: 'Fabric Types', icon: '👕' },
      { typeKey: 'GENDER', label: 'Target Gender / Age', icon: '👥' },
      { typeKey: 'SEASON', label: 'Season / Occasion', icon: '🗓️' },
      { typeKey: 'PATTERN', label: 'Patterns & Work', icon: '🎨' },
    ],
  },
  {
    communityId: 'jewellery',
    communityName: '💎 Jewellery & Gems Community',
    icon: '💎',
    description: 'Jewellery Categories, Purities, Gemstones & Certifications.',
    specs: [
      { typeKey: 'CATEGORY_JEWELLERY', label: 'Jewellery Categories', icon: '💎' },
      { typeKey: 'JEWELLERY_PURITY', label: 'Jewellery Purities', icon: '✨' },
      { typeKey: 'JEWELLERY_GEMSTONE', label: 'Jewellery Gemstones', icon: '📜' },
      { typeKey: 'JEWELLERY_CERT', label: 'Jewellery Certifications', icon: '🏷️' },
    ],
  },
  {
    communityId: 'hardware',
    communityName: '🔧 Hardware & Industrial Tools Community',
    icon: '🔧',
    description: 'Hardware Categories, Materials, Warranties, Power Ratings, Finishes & Applications.',
    specs: [
      { typeKey: 'CATEGORY_HARDWARE', label: 'Hardware Categories', icon: '🔧' },
      { typeKey: 'HARDWARE_MATERIAL', label: 'Hardware Materials', icon: '🔩' },
      { typeKey: 'HARDWARE_WARRANTY', label: 'Hardware Warranties', icon: '🛡️' },
      { typeKey: 'HARDWARE_POWER', label: 'Power Ratings', icon: '⚡' },
      { typeKey: 'HARDWARE_FINISH', label: 'Finishes', icon: '✨' },
      { typeKey: 'HARDWARE_APPLICATION', label: 'Applications', icon: '🏗️' },
    ],
  },
  {
    communityId: 'electronics',
    communityName: '⚡ Electronics & Electricals Community',
    icon: '⚡',
    description: 'Electronics Categories, Power Sources, Connectivities & Warranties.',
    specs: [
      { typeKey: 'CATEGORY_ELECTRONICS', label: 'Electronics Categories', icon: '💻' },
      { typeKey: 'ELEC_POWER', label: 'Power Sources', icon: '🔋' },
      { typeKey: 'ELEC_CONN', label: 'Connectivity Types', icon: '📡' },
      { typeKey: 'ELEC_WARRANTY', label: 'Electronics Warranties', icon: '🏷️' },
    ],
  },
  {
    communityId: 'grocery',
    communityName: '🌾 Grocery & Packaged Staples Community',
    icon: '🌾',
    description: 'Grocery Categories, Packaging Types, Shelf Lives & Certifications.',
    specs: [
      { typeKey: 'CATEGORY_GROCERY', label: 'Grocery Categories', icon: '🌾' },
      { typeKey: 'GROCERY_PACK', label: 'Packaging Types', icon: '📦' },
      { typeKey: 'GROCERY_SHELF', label: 'Shelf Life Options', icon: '⏳' },
      { typeKey: 'GROCERY_CERT', label: 'Grocery Certifications', icon: '🌱' },
    ],
  },
];

export function AdminCategoryRequestsPanel() {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'HIERARCHY'>('HIERARCHY');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  // Active expanded community section ('ALL' or community slug e.g. 'dipen', 'clothing')
  const [selectedCommunityFilter, setSelectedCommunityFilter] = useState<string>('ALL');

  // Community Modal State
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [commNameInput, setCommNameInput] = useState('');
  const [commDescInput, setCommDescInput] = useState('');

  // Reclassify / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'APPROVE_RECLASSIFY' | 'EDIT' | 'CREATE'>('APPROVE_RECLASSIFY');
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequestData | null>(null);
  const [formCommunitySlug, setFormCommunitySlug] = useState('clothing');
  const [formType, setFormType] = useState('FABRIC');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Redux RTK Queries & Mutations
  const { data: dbCommunities, refetch: refetchCommunities } = useGetCommunitiesQuery();
  const [createCommunity, { isLoading: isCreatingComm }] = useCreateCommunityMutation();
  const [updateCommunity] = useUpdateCommunityMutation();
  const [deleteCommunity] = useDeleteCommunityMutation();

  // Redux RTK Queries & Mutations
  const { data: requests, isLoading: isRequestsLoading, refetch: refetchRequests } = useGetCategoryRequestsQuery();
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
    refetchCommunities();
  };

  const openApproveModal = (req: CategoryRequestData) => {
    setSelectedRequest(req);
    setFormType(req.type);
    setCustomTypeInput('');
    setFormValue(req.value);
    setFormDescription(req.description || '');
    setModalMode('APPROVE_RECLASSIFY');
    setIsModalOpen(true);
  };

  const openEditModal = (req: CategoryRequestData) => {
    setSelectedRequest(req);
    setFormType(req.type);
    setCustomTypeInput('');
    setFormValue(req.value);
    setFormDescription(req.description || '');
    setFormCommunitySlug(req.communitySlug || 'clothing');
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const openCreateModal = (defaultTypeKey: string = 'FABRIC', targetCommSlug?: string) => {
    setSelectedRequest(null);
    setFormType(defaultTypeKey);
    setCustomTypeInput('');
    setFormValue('');
    setFormDescription('');
    setFormCommunitySlug(targetCommSlug || (selectedCommunityFilter !== 'ALL' ? selectedCommunityFilter : 'clothing'));
    setModalMode('CREATE');
    setIsModalOpen(true);
  };

  const handleSaveCommunityModal = async () => {
    if (!commNameInput.trim()) {
      alert('Community Name is required');
      return;
    }
    try {
      const res = await createCommunity({
        name: commNameInput.trim(),
        description: commDescInput.trim() || undefined,
      }).unwrap();
      showNotification(`🎉 Community '${commNameInput.trim()}' created!`);
      setIsCommModalOpen(false);
      setCommNameInput('');
      setCommDescInput('');
      refetchCommunities();
      refetchGlobalOptions();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to create community');
    }
  };

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
        showNotification(`✅ Approved & Reclassified '${formValue.trim()}' under ${finalType}!`);
      } else if (modalMode === 'EDIT' && selectedRequest) {
        await updateOption({
          id: selectedRequest.id,
          type: finalType,
          value: formValue.trim(),
          communitySlug: formCommunitySlug,
        }).unwrap();
        showNotification(`✏️ Updated specification option to '${formValue.trim()}' (${finalType})!`);
      } else if (modalMode === 'CREATE') {
        await createOption({
          type: finalType,
          value: formValue.trim(),
          description: formDescription.trim() || undefined,
          communitySlug: formCommunitySlug,
        }).unwrap();
        showNotification(`🎉 Added new option '${formValue.trim()}' to ${finalType} under ${formCommunitySlug}!`);
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
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
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
      case 'CATEGORY_CLOTHING': return globalOptions.clothingCategories || globalOptions.categories || [];
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

  const allDynamicCommunitiesList = [
    ...COMMUNITY_SECTIONS,
    ...(dbCommunities || [])
      .filter((dbc) => !COMMUNITY_SECTIONS.some((c) => c.communityId === dbc.slug))
      .map((dbc) => ({
        communityId: dbc.slug,
        communityName: `📁 ${dbc.name} Community`,
        icon: '📁',
        description: dbc.description || `Dynamic trade category and custom specifications for ${dbc.name}`,
        specs: [],
      })),
  ];

  const visibleCommunities = allDynamicCommunitiesList.filter(
    (c) => selectedCommunityFilter === 'ALL' || c.communityId === selectedCommunityFilter
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏷️</span>
            <h2 className="font-extrabold text-xl text-white">Dynamic Category & Community Specifications (CRUD)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Super Admin center: Easily manage category specification options grouped by trade community (Clothing, Jewellery, Hardware, Electronics, Grocery) and approve vendor requests.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('HIERARCHY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'HIERARCHY'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌳 Community Spec Hierarchy</span>
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⏳ Vendor Request Queue</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* VIEW 1: CATEGORY & SPECIFICATION HIERARCHY BY COMMUNITY */}
      {activeTab === 'HIERARCHY' && (
        <div className="space-y-6">
          {/* Filter Communities Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 glass-card p-4 rounded-2xl border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">Filter Community:</span>
              <button
                onClick={() => setSelectedCommunityFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCommunityFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                🌐 All Communities
              </button>
              {COMMUNITY_SECTIONS.map((c) => (
                <button
                  key={c.communityId}
                  onClick={() => setSelectedCommunityFilter(c.communityId)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedCommunityFilter === c.communityId
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.communityName.split(' ')[1]}</span>
                </button>
              ))}
              {(dbCommunities || [])
                .filter((dbc) => !COMMUNITY_SECTIONS.some((c) => c.communityId === dbc.slug))
                .map((dbc) => (
                  <button
                    key={dbc.id}
                    onClick={() => setSelectedCommunityFilter(dbc.slug)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedCommunityFilter === dbc.slug
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white'
                    }`}
                  >
                    <span>📁</span>
                    <span>{dbc.name}</span>
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCommModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                title="Create a new Community (e.g. Dipen, Rahul, Automobile)"
              >
                <span>➕ Create Community / Category</span>
              </button>
              <button
                onClick={() => openCreateModal('CUSTOM')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                title="Create custom spec option"
              >
                <span>➕ Create Spec Option (XYZ)</span>
              </button>
            </div>
          </div>

          {/* Render Community Accordion Cards */}
          {visibleCommunities.map((comm) => {
            // Find static specs + custom dynamic spec keys created for this community
            const commApprovedRequests = (requests || []).filter((r) => {
              if (r.status !== 'APPROVED') return false;

              const commIdLower = comm.communityId.toLowerCase();
              const reqCommLower = (r.communitySlug || '').toLowerCase();
              const reqTypeLower = (r.type || '').toLowerCase();

              // 1. Explicitly tagged to this community (e.g. communitySlug === 'xyz' or 'clothing')
              if (reqCommLower && reqCommLower === commIdLower) return true;

              // 2. Type matches community slug (e.g. type === 'XYZ' or 'CATEGORY_XYZ')
              if (reqTypeLower === commIdLower || reqTypeLower === `category_${commIdLower}`) return true;

              // 3. Static spec type key belonging to standard community with global/null communitySlug
              if (!reqCommLower && comm.specs.some((s) => s.typeKey.toLowerCase() === reqTypeLower)) return true;

              return false;
            });

            const dynamicSpecKeys = Array.from(new Set(commApprovedRequests.map((r) => r.type.toUpperCase())));

            const allSpecsForComm: SpecDef[] = [
              ...comm.specs,
              ...dynamicSpecKeys
                .filter((key) => !comm.specs.some((s) => s.typeKey.toUpperCase() === key))
                .map((key) => ({
                  typeKey: key,
                  label: key.replace(/_/g, ' '),
                  icon: '✨',
                })),
            ];

            return (
              <div key={comm.communityId} className="glass-card p-6 rounded-2xl border-slate-800 space-y-6">
                {/* Community Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-3 rounded-2xl bg-slate-900 border border-slate-800">{comm.icon}</span>
                    <div>
                      <h3 className="font-extrabold text-lg text-white">{comm.communityName}</h3>
                      <p className="text-xs text-slate-400">{comm.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openCreateModal('CUSTOM', comm.communityId)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-1.5"
                  >
                    <span>➕ Add Spec / Option for {comm.communityName.split(' ')[1] || comm.communityId}</span>
                  </button>
                </div>

                {/* Grid of Specification Attributes inside this Community */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allSpecsForComm.length === 0 ? (
                    <div className="col-span-full p-6 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                      <span>No specification options defined for {comm.communityName} yet.</span>
                      <button
                        onClick={() => openCreateModal('CUSTOM', comm.communityId)}
                        className="mt-1 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                      >
                        ➕ Add First Specification (e.g. GSM, Fabric, Size)
                      </button>
                    </div>
                  ) : (
                    allSpecsForComm.map((spec) => {
                      const staticValues = getGlobalValuesForGroup(spec.typeKey);
                      const specApprovedReqs = commApprovedRequests.filter(
                        (r) => r.type.toUpperCase() === spec.typeKey.toUpperCase()
                      );
                      const dbValues = specApprovedReqs.map((r) => r.value);

                      const allValues = Array.from(new Set([...staticValues, ...dbValues]));

                      return (
                        <div key={spec.typeKey} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{spec.icon}</span>
                                <h4 className="font-bold text-xs text-white">{spec.label}</h4>
                                <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
                                  {spec.typeKey}
                                </span>
                              </div>
                              <button
                                onClick={() => openCreateModal(spec.typeKey, comm.communityId)}
                                className="text-slate-400 hover:text-emerald-400 text-xs font-bold"
                                title={`Add option to ${spec.label}`}
                              >
                                ➕ Add
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {allValues.length === 0 ? (
                                <span className="text-[11px] text-slate-500 italic">No options defined yet.</span>
                              ) : (
                                allValues.map((val) => {
                                  const matchingReq = specApprovedReqs.find(
                                    (r) => r.value.trim().toLowerCase() === val.trim().toLowerCase()
                                  ) || (requests || []).find(
                                    (r) => r.type === spec.typeKey && r.value.trim().toLowerCase() === val.trim().toLowerCase()
                                  );

                                  return (
                                    <div
                                      key={val}
                                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-[11px] font-medium flex items-center gap-1.5 group hover:border-indigo-500 transition"
                                    >
                                      <span>{val}</span>
                                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                                        <button
                                          onClick={() =>
                                            matchingReq
                                              ? openEditModal(matchingReq)
                                              : openEditModal({ id: val, type: spec.typeKey, value: val, status: 'APPROVED', createdAt: '' } as any)
                                          }
                                          className="text-slate-400 hover:text-indigo-400 text-[10px]"
                                          title="Edit option"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDelete(matchingReq ? matchingReq.id : val, val)}
                                          className="text-slate-400 hover:text-rose-400 text-[10px]"
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: REQUESTS QUEUE & TABLE */}
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
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1.5">
                  Select Community / Category Target
                </label>
                <select
                  value={formCommunitySlug}
                  onChange={(e) => setFormCommunitySlug(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/50 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-purple-500 font-bold"
                >
                  {COMMUNITY_SECTIONS.map((c) => (
                    <option key={c.communityId} value={c.communityId}>
                      {c.icon} {c.communityName} ({c.communityId})
                    </option>
                  ))}
                  {(dbCommunities || [])
                    .filter((dbc) => !COMMUNITY_SECTIONS.some((c) => c.communityId === dbc.slug))
                    .map((dbc) => (
                      <option key={dbc.slug} value={dbc.slug}>
                        📁 {dbc.name} ({dbc.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Select Target Specification Group Key
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {COMMUNITY_SECTIONS.flatMap((comm) =>
                    comm.specs.map((spec) => (
                      <option key={spec.typeKey} value={spec.typeKey}>
                        {comm.icon} {comm.communityName.split(' ')[1]} ➔ {spec.label} ({spec.typeKey})
                      </option>
                    ))
                  )}
                  {(() => {
                    const standardTypeKeys = new Set(
                      COMMUNITY_SECTIONS.flatMap((comm) => comm.specs.map((s) => s.typeKey))
                    );
                    const customDbGroupKeys = Array.from(
                      new Set(
                        (requests || [])
                          .map((r) => r.type)
                          .filter((t) => t && !standardTypeKeys.has(t))
                      )
                    );
                    return customDbGroupKeys.map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        ✨ Custom Group: {typeKey}
                      </option>
                    ));
                  })()}
                  <option value="CUSTOM">➕ Create Custom Specification Group Title...</option>
                </select>
              </div>

              {formType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Enter Custom Group Key (e.g. GSM, FABRIC, SIZE, MATERIAL)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. GSM, FABRIC, SIZE"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-amber-500/50 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Sub-Option Value Text (e.g. 300gsm, Cotton, S, Steel)
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

      {/* MODAL FOR CREATING NEW COMMUNITY / CATEGORY */}
      {isCommModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border-purple-500/40 space-y-5 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>➕ Create New Community / Category</span>
              </h3>
              <button
                onClick={() => setIsCommModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Community / Category Name (e.g. Dipen, Rahul, Footwear)
                </label>
                <input
                  type="text"
                  placeholder="Enter Community Name..."
                  value={commNameInput}
                  onChange={(e) => setCommNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Description / Category Type (e.g. Clothing, Hardware, Industrial)
                </label>
                <input
                  type="text"
                  placeholder="Enter Description..."
                  value={commDescInput}
                  onChange={(e) => setCommDescInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCommModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCommunityModal}
                disabled={isCreatingComm}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg transition"
              >
                <span>➕ Create Community Live</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
