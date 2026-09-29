'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useGetPublicStoreQuery,
  useGetOwnerStoreQuery,
  useToggleProductStatusMutation,
  StoreResponse,
} from '../../lib/redux/api/storeApi';
import { useDeleteProductMutation } from '../../lib/redux/api/productsApi';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { useToast } from '../../components/common/Toast';
import { EditStoreModal } from './components/EditStoreModal';
import { ProductDetail } from '../products/components/ProductDetail';
import { ClothingProductCreateModal } from '../products/components/ClothingProductCreateModal';

interface StoreModuleProps {
  storeIdOrSlug?: string;
}

export function StoreModule({ storeIdOrSlug = 'me' }: StoreModuleProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const isOwnerRoute = !storeIdOrSlug || storeIdOrSlug === 'me';

  // Profile data
  const { data: profileData } = useGetProfileQuery();
  const currentUser = profileData?.user;

  // Store data queries
  const ownerStoreQueryResult = useGetOwnerStoreQuery(undefined, { skip: !isOwnerRoute });
  const publicStoreQueryResult = useGetPublicStoreQuery(storeIdOrSlug, { skip: isOwnerRoute });

  const activeQueryResult = isOwnerRoute ? ownerStoreQueryResult : publicStoreQueryResult;
  const { data: storeData, isLoading, isError, error, refetch } = activeQueryResult;

  // Product status toggle & deletion mutations
  const [toggleProductStatus, { isLoading: isToggling }] = useToggleProductStatusMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading Store & Product Catalog...</p>
      </div>
    );
  }

  // 403 COMMUNITY RESTRICTED or NOT FOUND GUARD
  if (isError || !storeData?.success) {
    const errorData = (error as any)?.data;
    const isCommunityRestricted = errorData?.code === 'COMMUNITY_RESTRICTED' || (error as any)?.status === 403;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-6 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/20">
            {isCommunityRestricted ? '🔒' : '⚠️'}
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
              {isCommunityRestricted ? 'COMMUNITY RESTRICTED' : 'STORE NOT FOUND'}
            </span>
            <h2 className="text-xl font-extrabold text-white">
              {isCommunityRestricted ? 'Access Denied' : 'Store Unavailable'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isCommunityRestricted
                ? 'This store catalog is restricted to members of permitted B2B trade communities. Your account does not share trade access with this business.'
                : 'The requested store catalog does not exist or has been deactivated by the owner.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/chat"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Back to B2B Chat 💬
            </Link>
            <Link
              href="/profile"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              View My Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { store, business, isOwner: isOwnerFromApi, products = [], stats } = storeData;

  const isOwner =
    Boolean(isOwnerFromApi) ||
    isOwnerRoute ||
    Boolean(currentUser?.id && business?.userId === currentUser.id);

  const isVerifiedBusiness = Boolean(
    business?.verificationTag || business?.status === 'APPROVED'
  );

  // Extract unique categories from products
  const categoriesList = Array.from(
    new Set(
      products
        .map((p) => p.category?.name || p.specs?.category || 'General')
        .filter(Boolean)
    )
  );

  // Filter products by search query and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const catName = p.category?.name || p.specs?.category || 'General';
    const matchesCategory = selectedCategory === 'ALL' || catName === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleToggleStatus = async (productId: string, currentIsActive: boolean) => {
    try {
      const res = await toggleProductStatus({
        productId,
        isActive: !currentIsActive,
      }).unwrap();
      if (res.success) {
        addToast(
          `Product status changed to ${!currentIsActive ? 'ACTIVE ✓' : 'INACTIVE 🔒'}`,
          'success'
        );
        refetch();
      }
    } catch (err: any) {
      addToast(`Status toggle failed: ${err?.data?.error || err.message}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete product "${title}"?`)) return;

    try {
      await deleteProduct(productId).unwrap();
      addToast(`Product "${title}" deleted`, 'success');
      refetch();
    } catch (err: any) {
      addToast(`Failed to delete product: ${err?.data?.error || err.message}`, 'error');
    }
  };

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}/store/${store.slug || store.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl);
      addToast('🔗 Store link copied to clipboard!', 'success');
    } else {
      addToast(`Store URL: ${storeUrl}`, 'info');
    }
  };

  const handleShareProduct = (product: any) => {
    const productUrl = `${window.location.origin}/product/${encodeURIComponent(product.code || product.id)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(productUrl);
      addToast(`🔗 Product SKU "${product.code}" link copied!`, 'success');
    } else {
      addToast(`Product SKU: ${product.code}`, 'info');
    }
  };

  const handleInquireOwner = (product?: any) => {
    const ownerUserId = business?.userId;
    if (!ownerUserId) {
      addToast('Unable to initiate chat: Store owner contact info missing', 'error');
      return;
    }

    const queryParams = new URLSearchParams();
    queryParams.set('userId', ownerUserId);
    if (product?.code) {
      queryParams.set('productCode', product.code);
    }
    router.push(`/chat?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Product Detail Modal */}
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

      {/* Owner Store Edit Modal */}
      {isOwner && (
        <EditStoreModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          store={store}
        />
      )}

      {/* Owner Create Product Modal */}
      {isOwner && (
        <ClothingProductCreateModal
          isOpen={isCreateProductModalOpen}
          onClose={() => setIsCreateProductModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* ============================================================ */}
      {/* 1. STORE HERO & BRANDING BANNER HEADER */}
      {/* ============================================================ */}
      <header className="relative bg-slate-900 border-b border-slate-800">
        {/* Banner Background */}
        <div className="h-44 sm:h-64 w-full bg-slate-950 relative overflow-hidden">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 opacity-80 flex items-center justify-center">
              <span className="text-4xl opacity-20">🏬</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Store Metadata Header Info */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            {/* Store Logo Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 border-4 border-slate-900 shadow-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-4xl">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-extrabold text-emerald-400">
                  {store.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-1 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {store.name}
                </h1>
                {isVerifiedBusiness && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    ✓ VERIFIED B2B
                  </span>
                )}
                {!store.isActive && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    INACTIVE STORE 🔒
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-emerald-400">
                  {business?.shopName || 'Business Catalog'}
                </span>
                <span>•</span>
                <span>Role: {business?.assignedRole || 'VENDOR'}</span>
                {business?.city && (
                  <>
                    <span>•</span>
                    <span>📍 {business.city}, {business.state}</span>
                  </>
                )}
              </p>

              {/* Permitted Communities Tags */}
              <div className="flex items-center gap-1.5 pt-1">
                {business?.allowedCommunities?.map((comm: string) => (
                  <span
                    key={comm}
                    className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30 uppercase"
                  >
                    🏷️ {comm}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isOwner ? (
              <>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                >
                  ✏️ Edit Store
                </button>
                <button
                  onClick={() => setIsCreateProductModalOpen(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition"
                >
                  ➕ Add Product
                </button>
                <button
                  onClick={handleShareStore}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
                  title="Share Store Link"
                >
                  🔗 Share
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleInquireOwner()}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  💬 Inquire / Chat with Vendor
                </button>
                <button
                  onClick={handleShareStore}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                >
                  🔗 Share Store
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio & Stats Toolbar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 space-y-4">
          {store.bio && (
            <p className="text-xs sm:text-sm text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 leading-relaxed max-w-3xl">
              {store.bio}
            </p>
          )}

          <div className="flex items-center gap-6 text-xs text-slate-400 border-t border-slate-800/60 pt-4">
            <div>
              <span className="text-white font-extrabold text-sm mr-1">
                {stats?.totalProducts ?? products.length}
              </span>
              <span>Total Products</span>
            </div>
            {isOwner && stats?.activeProducts !== undefined && (
              <div>
                <span className="text-emerald-400 font-extrabold text-sm mr-1">
                  {stats.activeProducts}
                </span>
                <span>Active Listings</span>
              </div>
            )}
            <div>
              <span className="text-indigo-400 font-extrabold text-sm mr-1">
                {business?.ownerName || 'Verified Owner'}
              </span>
              <span>Proprietor</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. STORE CATALOG SEARCH & CATEGORY FILTER TOOLBAR */}
      {/* ============================================================ */}
      <div className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Products ({products.length})
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search products by SKU or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
            <span className="absolute left-3 top-2 text-slate-500 text-xs">🔍</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PRODUCT CATALOG GRID */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-12">
            <div className="text-4xl">📦</div>
            <h3 className="font-extrabold text-white text-base">No Products Found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'No products matched your search or category filter.'
                : 'This store has not published any active catalog products yet.'}
            </p>
            {isOwner && (
              <button
                onClick={() => setIsCreateProductModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg transition"
              >
                + Add First Catalog Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const primaryImg = p.images?.[0] || '/placeholder-product.png';
              const priceTierStr =
                p.priceTiers && Array.isArray(p.priceTiers) && p.priceTiers.length > 0
                  ? `₹${p.priceTiers[0].price} / pc`
                  : p.price
                  ? `₹${p.price}`
                  : 'Contact for Price';

              return (
                <div
                  key={p.id}
                  className={`bg-slate-900 border rounded-3xl overflow-hidden flex flex-col justify-between transition group hover:shadow-xl ${
                    !p.isActive ? 'border-amber-500/40 opacity-75' : 'border-slate-800 hover:border-emerald-500/60'
                  }`}
                >
                  <div>
                    {/* Image Header & SKU Badge */}
                    <div className="relative h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={primaryImg}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />

                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 backdrop-blur-md">
                          {p.code}
                        </span>
                      </div>

                      {/* Owner Active/Inactive Status Overlay Pill */}
                      {isOwner && (
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              p.isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{p.category?.name || p.specs?.category || 'Catalog Item'}</span>
                        {p.moq && <span className="font-bold text-slate-300">MOQ: {p.moq} pcs</span>}
                      </div>

                      <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition">
                        {p.title}
                      </h3>

                      <p className="text-xs font-mono font-extrabold text-emerald-400">
                        {priceTierStr}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProductForDetail(p)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                      >
                        Details 👁️
                      </button>

                      {!isOwner && (
                        <button
                          onClick={() => handleInquireOwner(p)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold transition shadow"
                        >
                          Inquire 💬
                        </button>
                      )}

                      <button
                        onClick={() => handleShareProduct(p)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title="Share Product"
                      >
                        🔗
                      </button>
                    </div>

                    {/* Owner Management Controls */}
                    {isOwner && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                        <button
                          onClick={() => handleToggleStatus(p.id, p.isActive)}
                          disabled={isToggling}
                          className={`font-bold hover:underline ${
                            p.isActive ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {p.isActive ? 'Deactivate 🔒' : 'Activate ✓'}
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          disabled={isDeleting}
                          className="text-rose-400 hover:underline font-bold"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
