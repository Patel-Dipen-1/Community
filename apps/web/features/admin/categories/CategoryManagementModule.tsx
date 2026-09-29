'use client';

import React, { useState } from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { CommonSearch } from '../../../components/common/CommonSearch';
import { FormModal } from '../../../components/forms/FormModal';
import { useToast } from '../../../components/common/Toast';
import {
  useGetAdminCommunitiesQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useDeleteCommunityMutation,
  useGetAdminUsersQuery,
  useAllocateCommunitiesMutation,
} from '../../../lib/redux/api/adminApi';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive?: boolean;
  createdAt: string;
}

export function CategoryManagementModule() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State for Create/Edit Category
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // User Allocation Modal State
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // RTK Query Hooks
  const { data: communitiesRes, isLoading, refetch } = useGetAdminCommunitiesQuery();
  const { data: usersRes } = useGetAdminUsersQuery({ page: 1, limit: 100 });
  const [createCommunity, { isLoading: isCreating }] = useCreateCommunityMutation();
  const [updateCommunity, { isLoading: isUpdating }] = useUpdateCommunityMutation();
  const [deleteCommunity, { isLoading: isDeleting }] = useDeleteCommunityMutation();
  const [allocateCommunities, { isLoading: isAllocating }] = useAllocateCommunitiesMutation();

  const categories: CategoryItem[] = communitiesRes?.communities || communitiesRes?.data || [];
  const users = usersRes?.users || usersRes?.data || [];

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIsActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIsActive(cat.isActive !== undefined ? cat.isActive : true);
    setIsCategoryModalOpen(true);
  };

  const handleToggleStatus = async (cat: CategoryItem) => {
    try {
      const newStatus = !cat.isActive;
      const res = await updateCommunity({
        id: cat.id,
        isActive: newStatus,
      }).unwrap();
      addToast(res.message || `Category ${newStatus ? 'activated' : 'deactivated'}!`, 'success');
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to toggle status'}`, 'error');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('⚠️ Category name is required', 'warning');
      return;
    }

    try {
      if (editingCategory) {
        const res = await updateCommunity({
          id: editingCategory.id,
          name,
          slug: slug || undefined,
          description,
          isActive,
        }).unwrap();
        addToast(res.message || 'Category updated successfully!', 'success');
      } else {
        const res = await createCommunity({
          name,
          slug: slug || undefined,
          description,
          isActive,
        }).unwrap();
        addToast(res.message || 'New Category created successfully!', 'success');
      }
      setIsCategoryModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to save category'}`, 'error');
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      const res = await deleteCommunity(cat.id).unwrap();
      addToast(res.message || 'Category deleted', 'info');
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to delete category'}`, 'error');
    }
  };

  // Allocation Handlers
  const handleOpenAllocateModal = (userId?: string) => {
    if (userId) {
      setSelectedUserId(userId);
      const targetUser = users.find((u: any) => u.userId === userId);
      setSelectedCategories(targetUser?.allowedCommunities || ['clothing']);
    } else if (users.length > 0) {
      setSelectedUserId(users[0].userId);
      setSelectedCategories(users[0].allowedCommunities || ['clothing']);
    }
    setIsAllocateModalOpen(true);
  };

  const handleToggleCategorySelection = (catSlug: string) => {
    if (selectedCategories.includes(catSlug)) {
      if (selectedCategories.length === 1) {
        addToast('⚠️ User must have at least 1 allocated category.', 'warning');
        return;
      }
      setSelectedCategories(selectedCategories.filter((s) => s !== catSlug));
    } else {
      setSelectedCategories([...selectedCategories, catSlug]);
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      addToast('⚠️ Please select a user', 'warning');
      return;
    }

    try {
      const res = await allocateCommunities({
        userId: selectedUserId,
        allowedCommunities: selectedCategories,
      }).unwrap();
      addToast(res.message || 'Category allocation updated successfully!', 'success');
      setIsAllocateModalOpen(false);
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Allocation failed'}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="🏷️ Dynamic Category & Community Management (CRUD)"
        description="Super Admin portal to dynamically create new trade categories (like Super User XYZ categories), edit spec templates, and allocate allowed category permissions to any user account."
        badge={`${categories.length} Categories Active`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAllocateModal()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              🎯 Allocate Categories to User
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              ➕ Create New Category
            </button>
          </div>
        }
      />

      {/* 2. Search & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <CommonSearch
          placeholder="Search categories by name, slug or description..."
          value={search}
          onChange={setSearch}
        />

        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold self-start sm:self-auto"
        >
          🔄 Refresh List
        </button>
      </div>

      {/* 3. Dynamic Category Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">Loading dynamic categories...</div>
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-[11px] border border-emerald-500/20 font-bold">
                    slug: {cat.slug}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      cat.isActive !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {cat.isActive !== false ? '● Active' : '○ Deactivated'}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white">{cat.name}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => handleToggleStatus(cat)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                      cat.isActive !== false
                        ? 'bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 text-amber-300'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300'
                    }`}
                  >
                    {cat.isActive !== false ? '⏸️ Deactivate' : '▶️ Activate'}
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 font-bold text-xs transition flex items-center gap-1"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
          No categories found matching "{search}".
        </div>
      )}

      {/* 4. Create / Edit Category Form Modal */}
      <FormModal
        isOpen={isCategoryModalOpen}
        title={editingCategory ? `✏️ Edit Category: ${editingCategory.name}` : '➕ Create Dynamic Trade Category'}
        subtitle="Super Admin can create any trade category (e.g. Super User XYZ Category) dynamically in the platform."
        maxWidth="lg"
        onClose={() => setIsCategoryModalOpen(false)}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Super User XYZ Category, Hardware & Tools, Leather"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editingCategory) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Unique Slug Identifier</label>
            <input
              type="text"
              placeholder="e.g. xyz-category, hardware, footwear"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-emerald-300 font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Used in URL routes and server database queries.</p>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Category Description</label>
            <textarea
              rows={3}
              placeholder="Describe the trade items included in this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {editingCategory ? 'Update Category ➔' : 'Create Category Now ➔'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* 5. Category Allocation to Users Modal */}
      <FormModal
        isOpen={isAllocateModalOpen}
        title="🎯 Allocate Allowed Categories to User Account"
        subtitle="Super Admin can dynamically assign or revoke multi-category permissions for any Super User or business account."
        maxWidth="xl"
        onClose={() => setIsAllocateModalOpen(false)}
      >
        <form onSubmit={handleSaveAllocation} className="space-y-5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Select User / Business Account *</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                const targetUser = users.find((u: any) => u.userId === e.target.value);
                if (targetUser) {
                  setSelectedCategories(targetUser.allowedCommunities || ['clothing']);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
            >
              {users.map((u: any) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName} ({u.shopName || 'No Shop'}) - Role: {u.assignedRole} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-2">
              Select Allowed Categories ({selectedCategories.length} Selected):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategorySelection(cat.slug)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition text-left ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{cat.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{cat.slug}</p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isSelected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAllocateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAllocating}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              Save Category Allocations ➔
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
