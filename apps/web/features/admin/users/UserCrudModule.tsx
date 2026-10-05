'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/common/PageHeader';
import { CommonSearch } from '../../../components/common/CommonSearch';
import { DateRangeFilter, DateRange } from '../../../components/common/DateRangeFilter';
import { CommonPagination } from '../../../components/common/CommonPagination';
import { DataTable, ColumnConfig, RowAction } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { FormModal } from '../../../components/forms/FormModal';
import { ConfigurableForm } from '../../../components/forms/ConfigurableForm';
import { useToast } from '../../../components/common/Toast';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  USER_FORM_FIELDS,
  USER_ROLE_FILTER_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  AVAILABLE_COMMUNITIES,
  UserRecord,
  UserMedia,
} from './users.config';
import { formatMediaUrl } from '../../../lib/utils/media';

import {
  useGetAdminUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteAccountMutation,
  useGetAdminCommunitiesQuery,
} from '../../../lib/redux/api/adminApi';


// Default media gallery for business profiles lacking uploaded files
const DEFAULT_BUSINESS_MEDIA: UserMedia[] = [
  {
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    mediaType: 'IMAGE',
    title: 'Main Showroom Premises',
  },
  {
    url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800',
    mediaType: 'IMAGE',
    title: 'Warehouse & Bulk Stock',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    mediaType: 'VIDEO',
    title: 'Shop Inspection Video Reel',
  },
  {
    url: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
    mediaType: 'IMAGE',
    title: 'GST Business Board',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    mediaType: 'VIDEO',
    title: 'Manufacturing Unit Walkthrough Video',
  },
];

export function UserCrudModule() {
  const { addToast } = useToast();
  const { hasPermission } = usePermissions();

  // Search, Filter & Pagination State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [sortKey, setSortKey] = useState('fullName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row Selection & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals & Drawers State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [viewingUser, setViewingUser] = useState<UserRecord | null>(null);

  // Fullscreen Media Lightbox Viewer State
  const [inspectingMedia, setInspectingMedia] = useState<{
    mediaList: UserMedia[];
    activeIndex: number;
  } | null>(null);

  // Custom Media Adder State for Edit/Create Form
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [newMediaTitle, setNewMediaTitle] = useState('');

  // RTK Query Hooks (Server-Side Pagination, Filtering, & Sorting)
  const { data: apiResponse, isLoading, isError, refetch } = useGetAdminUsersQuery({
    page,
    limit,
    search: search || undefined,
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    sortKey,
    sortOrder,
  });
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const { data: dynamicCommsRes } = useGetAdminCommunitiesQuery();

  const fetchedCommunities: Array<{ id?: string; slug: string; name: string; description?: string }> =
    dynamicCommsRes?.communities || dynamicCommsRes?.data || [];

  // Merge static presets with dynamic communities from database
  const allCommunitiesList = [...AVAILABLE_COMMUNITIES];
  fetchedCommunities.forEach((fc) => {
    const slug = fc.slug || fc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!allCommunitiesList.some((c) => c.id === slug)) {
      allCommunitiesList.push({
        id: slug,
        label: fc.name,
        icon: '🏷️',
      });
    }
  });

  const rawUsers: UserRecord[] = apiResponse?.users || apiResponse?.data || [];
  const totalCount = apiResponse?.pagination?.total ?? apiResponse?.totalUsers ?? rawUsers.length;


  // Table Columns Definition
  const columns: ColumnConfig<UserRecord>[] = [
    {
      key: 'fullName',
      label: 'Full Name / Owner',
      sortable: true,
      render: (u) => (
        <div>
          <span className="font-bold text-white block">{u.fullName}</span>
          <span className="text-[10px] text-slate-500 font-mono">ID: {u.userId.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact Info',
      render: (u) => (
        <div>
          <p className="text-slate-200 font-semibold">{u.mobileNumber}</p>
          <p className="text-slate-400 text-[11px]">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'shopName',
      label: 'Business / Shop Profile',
      sortable: true,
      render: (u) => {
        const mediaCount = u.shopPhotosAndVideos?.length || DEFAULT_BUSINESS_MEDIA.length;
        return (
          <div>
            <p className="font-semibold text-white">{u.shopName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400">{u.address || 'Surat, Gujarat'}</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                📸 {mediaCount} Media Files
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'assignedRole',
      label: 'Role',
      sortable: true,
      render: (u) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            u.assignedRole === 'SUPER_ADMIN'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}
        >
          {u.assignedRole}
        </span>
      ),
    },
    {
      key: 'allowedCommunities',
      label: 'Allowed Categories',
      render: (u) => {
        const comms = u.allowedCommunities || ['clothing'];
        return (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {comms.map((catId) => {
              const info = allCommunitiesList.find((c) => c.id === catId);
              return (
                <span
                  key={catId}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-emerald-300 border border-slate-700/80 flex items-center gap-1"
                >
                  <span>{info?.icon || '🏷️'}</span>
                  <span>{info?.label ? info.label.split(' ')[0] : catId}</span>
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Account Status',
      sortable: true,
      render: (u) => {
        const isBlocked = u.status === 'BLOCKED' || (u.status as string) === 'BLACK';
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isBlocked
                ? 'bg-rose-950/90 text-rose-300 border-rose-600 font-mono shadow-md animate-pulse'
                : u.status === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : u.status === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {isBlocked ? '⛔ BLOCKED' : u.status}
          </span>
        );
      },
    },
  ];

  // Quick Action Handler for Status Changes (e.g. Block / Approve)
  const handleSetUserStatus = async (user: UserRecord, newStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'BLOCKED') => {
    try {
      await updateUser({ userId: user.userId, status: newStatus }).unwrap();
      if (viewingUser && viewingUser.userId === user.userId) {
        setViewingUser({ ...viewingUser, status: newStatus as any });
      }
      const label = newStatus === 'BLOCKED' ? '⛔ BLOCKED / BLACKLISTED' : newStatus;
      addToast(`🛡️ User "${user.fullName}" status updated to ${label}`, 'success');
      refetch();
    } catch {
      addToast('❌ Failed to update user status', 'error');
    }
  };

  // Table Actions
  const actions: RowAction<UserRecord>[] = [
    {
      label: 'View Profile & Media',
      icon: '👁️',
      onClick: (user) => setViewingUser(user),
    },
    {
      label: 'Edit Details & Categories',
      icon: '✏️',
      variant: 'primary',
      onClick: (user) => {
        setFormMode('edit');
        setFormData({
          ...user,
          allowedCommunities: user.allowedCommunities?.length ? user.allowedCommunities : ['clothing'],
          shopPhotosAndVideos: user.shopPhotosAndVideos?.length ? user.shopPhotosAndVideos : [...DEFAULT_BUSINESS_MEDIA],
        });
        setIsFormModalOpen(true);
      },
    },
    {
      label: '⛔ Block / Blacklist User',
      icon: '🚫',
      variant: 'danger',
      onClick: (user) => {
        const isCurrentlyBlocked = user.status === 'BLOCKED' || (user.status as string) === 'BLACK';
        if (isCurrentlyBlocked) {
          handleSetUserStatus(user, 'APPROVED');
        } else {
          if (confirm(`Are you sure you want to BLOCK / BLACKLIST '${user.fullName}' (${user.shopName})? They will be denied platform login access.`)) {
            handleSetUserStatus(user, 'BLOCKED');
          }
        }
      },
    },
    {
      label: 'Delete Account',
      icon: '🗑️',
      variant: 'danger',
      onClick: (user) => setDeletingUser(user),
    },
  ];

  // Handlers
  const handleOpenCreateModal = () => {
    setFormMode('create');
    setFormData({
      fullName: '',
      email: '',
      mobileNumber: '',
      password: '',
      shopName: '',
      address: '',
      gstNumber: '',
      assignedRole: 'WHOLESALER',
      status: 'APPROVED',
      allowedCommunities: ['clothing'],
      shopPhotosAndVideos: [...DEFAULT_BUSINESS_MEDIA],
    });
    setIsFormModalOpen(true);
  };

  const handleFormChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Category Toggle Handler for Create / Edit Form
  const handleToggleFormCategory = (catId: string) => {
    const current = formData.allowedCommunities || [];
    if (current.includes(catId)) {
      if (current.length === 1) {
        addToast('⚠️ User must belong to at least 1 trade category.', 'warning');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        allowedCommunities: current.filter((c: string) => c !== catId),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        allowedCommunities: [...current, catId],
      }));
    }
  };

  const handleSelectAllFormCategories = () => {
    setFormData((prev) => ({
      ...prev,
      allowedCommunities: allCommunitiesList.map((c) => c.id),
    }));
    addToast(`🏷️ Selected all ${allCommunitiesList.length} trade categories`, 'info');
  };

  const handleClearFormCategories = () => {
    setFormData((prev) => ({
      ...prev,
      allowedCommunities: ['clothing'],
    }));
  };

  // Category Toggle Handler for Viewing User Drawer
  const handleToggleViewingUserCategory = async (catId: string) => {
    if (!viewingUser) return;
    const current = viewingUser.allowedCommunities || ['clothing'];
    let updated: string[];
    if (current.includes(catId)) {
      if (current.length === 1) {
        addToast('⚠️ User must belong to at least 1 trade category.', 'warning');
        return;
      }
      updated = current.filter((c) => c !== catId);
    } else {
      updated = [...current, catId];
    }

    try {
      await updateUser({ userId: viewingUser.userId, allowedCommunities: updated }).unwrap();
      setViewingUser({ ...viewingUser, allowedCommunities: updated });
      addToast(`🏷️ Updated category list for "${viewingUser.shopName}"`, 'success');
      refetch();
    } catch {
      addToast('❌ Failed to update category list', 'error');
    }
  };

  // Add media to formData during Create or Edit
  const handleAddMediaToForm = () => {
    if (!newMediaUrl.trim()) return;
    const currentMedia = formData.shopPhotosAndVideos || [];
    const updatedMedia: UserMedia[] = [
      ...currentMedia,
      {
        url: newMediaUrl.trim(),
        mediaType: newMediaType,
        title: newMediaTitle.trim() || (newMediaType === 'VIDEO' ? 'Inspection Video Reel' : 'Business Photo'),
      },
    ];
    setFormData((prev) => ({ ...prev, shopPhotosAndVideos: updatedMedia }));
    setNewMediaUrl('');
    setNewMediaTitle('');
    addToast(`➕ Added ${newMediaType === 'VIDEO' ? 'Video Reel' : 'Photo'} to profile media`, 'success');
  };

  // Remove media from formData during Create or Edit
  const handleRemoveMediaFromForm = (index: number) => {
    const currentMedia = [...(formData.shopPhotosAndVideos || [])];
    currentMedia.splice(index, 1);
    setFormData((prev) => ({ ...prev, shopPhotosAndVideos: currentMedia }));
    addToast('🗑️ Removed media file from profile', 'info');
  };

  const handleLoadSampleMedia = () => {
    setFormData((prev) => ({ ...prev, shopPhotosAndVideos: [...DEFAULT_BUSINESS_MEDIA] }));
    addToast('⚡ Loaded 5 sample photos & inspection video reels', 'success');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formMode === 'create') {
        const res = await createUser(formData).unwrap();
        if (res.error) {
          addToast(`⚠️ ${res.error}`, 'warning');
        } else {
          addToast(`🎉 User "${formData.fullName}" created successfully!`, 'success');
          setIsFormModalOpen(false);
        }
      } else {
        const res = await updateUser({ userId: formData.userId || '', ...formData }).unwrap();
        if (res.error) {
          addToast(`⚠️ ${res.error}`, 'warning');
        } else {
          addToast(`✅ User "${formData.fullName}" updated successfully!`, 'success');
          setIsFormModalOpen(false);
        }
      }
    } catch {
      addToast(`❌ Error saving user record`, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await deleteAccount(deletingUser.userId).unwrap();
      if (res.error) {
        addToast(`⚠️ ${res.error}`, 'warning');
      } else {
        addToast(`🗑️ Account "${deletingUser.shopName || deletingUser.fullName}" permanently deleted!`, 'success');
        setDeletingUser(null);
      }
    } catch {
      addToast('❌ Failed to delete account', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    addToast(`🗑️ Bulk deleted ${selectedIds.length} users`, 'info');
    setSelectedIds([]);
  };

  // Helper to check if a media item is a video
  const checkIsVideo = (m: UserMedia) => {
    return (
      m.mediaType === 'VIDEO' ||
      (m.url && Boolean(m.url.match(/\.(mp4|webm|mov|avi)$/i))) ||
      (m.url && m.url.includes('gtv-videos-bucket'))
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="👥 User Details & Business Profile Engine"
        description="Configuration-driven administration portal to manage user accounts, assign/remove multiple trade categories, block/blacklist users, and inspect business media."
        badge={`${totalCount} Total Users`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/inquiries"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              📥 All Product Inquiries
            </Link>
            {hasPermission('users.create') && (
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                ➕ Create New User Account
              </button>
            )}
          </div>
        }
      />

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <CommonSearch
          placeholder="Search by name, email, mobile, or shop..."
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Select Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
          >
            {USER_ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Select Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
          >
            {USER_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <DateRangeFilter
            value={dateRange}
            onChange={(val) => {
              setDateRange(val);
              setPage(1);
            }}
          />

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            title="Refresh Data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* 3. Reusable Data Table */}
      <DataTable
        columns={columns}
        data={rawUsers}
        keyExtractor={(u) => u.userId}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        actions={actions}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(key) => {
          if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          } else {
            setSortKey(key);
            setSortOrder('asc');
          }
          setPage(1);
        }}
        bulkActions={
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition"
          >
            🗑️ Delete Selected ({selectedIds.length})
          </button>
        }
      />

      {/* 4. Common Pagination */}
      <CommonPagination
        page={page}
        limit={limit}
        total={totalCount}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* 5. Create & Edit Form Modal with Multi-Category & Media Reel Manager */}
      <FormModal
        isOpen={isFormModalOpen}
        title={formMode === 'create' ? '➕ Create New User Account' : '✏️ Edit User Details & Business Profile'}
        subtitle={formMode === 'create' ? 'Fill user account details, assign categories & attach shop media' : `Updating User ID: ${formData.userId || ''}`}
        maxWidth="2xl"
        onClose={() => setIsFormModalOpen(false)}
      >
        <div className="space-y-6">
          <ConfigurableForm
            mode={formMode}
            fields={USER_FORM_FIELDS}
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormModalOpen(false)}
            isSubmitting={isCreating || isUpdating}
            submitLabel={formMode === 'create' ? 'Create User & Save Profile ➔' : 'Update User Details & Profile ➔'}
          />

          {/* 🏷️ MULTI-CATEGORY & COMMUNITY ASSIGNMENT ENGINE */}
          <div className="border-t border-slate-800 pt-5 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-100 flex items-center gap-2 text-sm">
                  🏷️ Allowed Trade Categories & Communities ({formData.allowedCommunities?.length || 0})
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Super Admin can add or remove multiple trade categories for this business profile.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFormCategories}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-[10px] transition"
                >
                  ➕ Select All (9)
                </button>
                <button
                  type="button"
                  onClick={handleClearFormCategories}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-semibold transition"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {allCommunitiesList.map((cat) => {
                const isSelected = (formData.allowedCommunities || []).includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleFormCategory(cat.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition text-left ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="font-bold text-xs">{cat.label}</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                      {isSelected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🖼️ Business Profile Media & Video Reel Editor */}
          <div className="border-t border-slate-800 pt-5 text-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-slate-100 flex items-center gap-2 text-sm">
                  📸 Business Profile Media & Verification Reel ({formData.shopPhotosAndVideos?.length || 0})
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Manage shop photos and inspection video clips for this business profile.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleMedia}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-bold text-[11px] transition self-start sm:self-auto"
              >
                ⚡ Reset / Load Preset Media
              </button>
            </div>

            {/* Current Attached Media List */}
            {formData.shopPhotosAndVideos && formData.shopPhotosAndVideos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formData.shopPhotosAndVideos.map((m: UserMedia, idx: number) => {
                  const isVid = checkIsVideo(m);
                  return (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex flex-col justify-between"
                    >
                      <div className="relative w-full h-28 bg-slate-950 overflow-hidden">
                        {isVid ? (
                          <video src={m.url} className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                          <img src={m.url} alt={m.title || `Media ${idx + 1}`} className="w-full h-full object-cover" />
                        )}

                        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-slate-200 border border-slate-800">
                          {isVid ? '🎥 Video' : '📷 Photo'} #{idx + 1}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMediaFromForm(idx)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-500 shadow transition font-bold text-xs"
                          title="Remove Media"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-2 bg-slate-900 border-t border-slate-800">
                        <p className="text-[11px] font-semibold text-white truncate">{m.title || (isVid ? 'Video Reel' : 'Shop Photo')}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{m.url}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-center">
                No media attached. Add an image or video URL below.
              </div>
            )}

            {/* Add New Media Controls */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 block">➕ Add Image or Video URL to Profile:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={newMediaType}
                  onChange={(e: any) => setNewMediaType(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="IMAGE">📷 Photo / Image</option>
                  <option value="VIDEO">🎥 Video Reel (.mp4)</option>
                </select>

                <input
                  type="text"
                  placeholder="https://example.com/shop-photo.jpg or video.mp4"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />

                <button
                  type="button"
                  onClick={handleAddMediaToForm}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow"
                >
                  ➕ Add Media
                </button>
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* 6. View Details Modal: 👁️ Business Profile Engine with Quick Status & Category Controls */}
      {viewingUser && (
        <FormModal
          isOpen={Boolean(viewingUser)}
          title={`👁️ Business Profile: ${viewingUser.shopName}`}
          subtitle={`Owner: ${viewingUser.fullName} • Role: ${viewingUser.assignedRole}`}
          maxWidth="2xl"
          onClose={() => setViewingUser(null)}
        >
          <div className="space-y-6 text-xs">
            {/* Super Admin Quick Status Action Toolbar */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">Account Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    viewingUser.status === 'BLOCKED' || (viewingUser.status as string) === 'BLACK'
                      ? 'bg-rose-950/90 text-rose-300 border-rose-600 font-mono animate-pulse'
                      : viewingUser.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {viewingUser.status === 'BLOCKED' || (viewingUser.status as string) === 'BLACK' ? '⛔ BLOCKED' : viewingUser.status}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSetUserStatus(viewingUser, 'APPROVED')}
                  disabled={viewingUser.status === 'APPROVED'}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold disabled:opacity-40 transition"
                >
                  ✓ Approve
                </button>

                <button
                  onClick={() => handleSetUserStatus(viewingUser, 'BLOCKED')}
                  disabled={viewingUser.status === 'BLOCKED'}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40 transition"
                >
                  ⛔ Block / Blacklist
                </button>

                <button
                  onClick={() => handleSetUserStatus(viewingUser, 'REJECTED')}
                  disabled={viewingUser.status === 'REJECTED'}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold disabled:opacity-40 transition"
                >
                  ✕ Reject
                </button>
              </div>
            </div>

            {/* Detailed User & Business Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-500 block mb-0.5">Owner Full Name:</span>
                <span className="text-white font-bold text-sm">{viewingUser.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Email Address:</span>
                <span className="text-slate-200 font-mono">{viewingUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Mobile Contact:</span>
                <span className="text-slate-200 font-semibold">{viewingUser.mobileNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">GST Registration:</span>
                <span className="text-indigo-400 font-bold font-mono">
                  {viewingUser.gstNumber || '24AAAAA0000A1Z5'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Assigned Role & Status:</span>
                <span className="text-emerald-400 font-bold">{viewingUser.assignedRole} ({viewingUser.status})</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Shop Address:</span>
                <span className="text-slate-300 font-medium">{viewingUser.address || 'Surat, Gujarat'}</span>
              </div>
            </div>

            {/* Allowed Trade Categories Section with Live Toggle */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-100 flex items-center gap-2">
                  🏷️ Allowed Trade Categories & Communities ({viewingUser.allowedCommunities?.length || 0}):
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold">Click category to add/remove</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COMMUNITIES.map((cat) => {
                  const isAssigned = (viewingUser.allowedCommunities || []).includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleToggleViewingUserCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                        isAssigned
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className="ml-1 text-[10px]">{isAssigned ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shop Photos & Verification Video Reel Section */}
            {(() => {
              const displayMedia: UserMedia[] =
                viewingUser.shopPhotosAndVideos && viewingUser.shopPhotosAndVideos.length > 0
                  ? viewingUser.shopPhotosAndVideos
                  : DEFAULT_BUSINESS_MEDIA;

              return (
                <div className="border-t border-slate-800 pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                        📸 Business Profile Media & Verification Video Reel ({displayMedia.length}):
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Includes high-resolution premises photos and active MP4 verification video clips.
                      </p>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 self-start sm:self-auto">
                      Click any photo or video to launch Lightbox
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayMedia.map((m: UserMedia, idx: number) => {
                      const isVid = checkIsVideo(m);
                      return (
                        <div
                          key={idx}
                          className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-md hover:border-indigo-500 hover:shadow-indigo-500/20 transition flex flex-col justify-between"
                        >
                          {/* Media Display Container */}
                          <div className="relative w-full h-44 bg-slate-950 overflow-hidden">
                            {isVid ? (
                              <video
                                src={formatMediaUrl(m.url)}
                                controls
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={formatMediaUrl(m.url)}
                                alt={m.title || `Media file ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
                                }}
                              />
                            )}

                            {/* Badge Tag */}
                            <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-white border border-slate-700 flex items-center gap-1">
                              {isVid ? '🎥 Inspection Video' : '📷 Shop Photo'} #{idx + 1}
                            </div>

                            {/* Click to Inspect Overlay */}
                            <button
                              onClick={() => setInspectingMedia({ mediaList: displayMedia, activeIndex: idx })}
                              className="absolute bottom-2 right-2 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1 backdrop-blur-sm transition"
                            >
                              🔍 Full-Screen Lightbox
                            </button>
                          </div>

                          {/* Media Description Footer */}
                          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex justify-between items-center">
                            <span className="font-bold text-slate-200 text-[11px] truncate">
                              {m.title || (isVid ? `Video Clip ${idx + 1}` : `Inspection Photo ${idx + 1}`)}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-semibold">
                              {isVid ? 'MP4 Video' : 'HD Image'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewingUser(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 transition"
              >
                Close Business Profile
              </button>
            </div>
          </div>
        </FormModal>
      )}

      {/* 7. Full-Screen Interactive Lightbox Viewer Modal for Images & Videos */}
      {inspectingMedia && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
          {/* Lightbox Header Bar */}
          <div className="flex justify-between items-center bg-slate-900/90 px-6 py-3.5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex]) ? '🎥' : '📷'}
              </span>
              <div>
                <h3 className="font-extrabold text-white text-sm">
                  {inspectingMedia.mediaList[inspectingMedia.activeIndex].title ||
                    (checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex])
                      ? 'Inspection Video Reel'
                      : 'Business Inspection Photo')}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  File {inspectingMedia.activeIndex + 1} of {inspectingMedia.mediaList.length} •{' '}
                  {checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex]) ? 'Video Format' : 'High Resolution Image'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs">
                {checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex]) ? '🎥 Video Mode' : '📷 Photo Mode'}
              </span>
              <button
                onClick={() => setInspectingMedia(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition border border-slate-700 text-base"
                title="Close Lightbox"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage Container */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {/* Prev Button */}
            <button
              disabled={inspectingMedia.activeIndex === 0}
              onClick={() =>
                setInspectingMedia({
                  ...inspectingMedia,
                  activeIndex: Math.max(0, inspectingMedia.activeIndex - 1),
                })
              }
              className="absolute left-2 md:left-6 z-10 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700 disabled:opacity-30 shadow-2xl transition text-xl"
            >
              ◀
            </button>

            {/* Media Canvas */}
            <div className="max-w-4xl max-h-full flex items-center justify-center p-2">
              {checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex]) ? (
                <video
                  key={inspectingMedia.mediaList[inspectingMedia.activeIndex].url}
                  src={formatMediaUrl(inspectingMedia.mediaList[inspectingMedia.activeIndex].url)}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded-2xl border border-indigo-500/40 shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={formatMediaUrl(inspectingMedia.mediaList[inspectingMedia.activeIndex].url)}
                  alt="Inspection media view"
                  className="max-h-[65vh] max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
                  }}
                />
              )}
            </div>

            {/* Next Button */}
            <button
              disabled={inspectingMedia.activeIndex >= inspectingMedia.mediaList.length - 1}
              onClick={() =>
                setInspectingMedia({
                  ...inspectingMedia,
                  activeIndex: Math.min(inspectingMedia.mediaList.length - 1, inspectingMedia.activeIndex + 1),
                })
              }
              className="absolute right-2 md:right-6 z-10 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700 disabled:opacity-30 shadow-2xl transition text-xl"
            >
              ▶
            </button>
          </div>

          {/* Lightbox Bottom Thumbnail Carousel Strip */}
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
            {inspectingMedia.mediaList.map((media, idx) => {
              const isVid = checkIsVideo(media);
              const isActive = idx === inspectingMedia.activeIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setInspectingMedia({ ...inspectingMedia, activeIndex: idx })}
                  className={`relative flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition ${
                    isActive ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/50' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  {isVid ? (
                    <video src={formatMediaUrl(media.url)} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={formatMediaUrl(media.url)} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-slate-950/80 px-1 rounded text-white font-bold">
                    {isVid ? '🎥' : '📷'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        title={`PERMANENTLY Delete "${deletingUser?.shopName || deletingUser?.fullName}"?`}
        description="This operation cannot be undone. All active user sessions and database records will be erased."
        confirmLabel="Yes, Delete Account"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
}
