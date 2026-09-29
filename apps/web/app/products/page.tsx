'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useGetProductsQuery } from '../../lib/redux/api/productsApi';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { ProductCard } from '../../features/products/components/ProductCard';
import { ProductDetail } from '../../features/products/components/ProductDetail';
import { ClothingProductCreateModal } from '../../features/products/components/ClothingProductCreateModal';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'HOT_SELLING' | 'ETHNIC' | 'MENS' | 'FABRIC'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch logged in user profile to check approval status
  const { data: profileData } = useGetProfileQuery();
  const user = profileData?.user;
  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');

  // Fetch products with RTK Query
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    communityId: 'clothing',
    query: searchQuery || undefined,
    isHotSelling: activeTab === 'HOT_SELLING' ? true : undefined,
  });

  const productsList = data?.products || [];

  // Filter products by selected clothing category tab
  const filteredProducts = productsList.filter((p: any) => {
    if (activeTab === 'HOT_SELLING') return p.isHotSelling;
    if (activeTab === 'ETHNIC') {
      const cat = (p.specs?.category || p.category?.name || '').toLowerCase();
      return cat.includes('ethnic') || cat.includes('kurti') || cat.includes('saree');
    }
    if (activeTab === 'MENS') {
      const cat = (p.specs?.category || p.category?.name || '').toLowerCase();
      return cat.includes('men') || cat.includes('shirt') || cat.includes('t-shirt');
    }
    if (activeTab === 'FABRIC') {
      const cat = (p.specs?.category || p.category?.name || '').toLowerCase();
      return cat.includes('fabric') || cat.includes('roll');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-indigo-500/30">
            B2B
          </Link>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-white leading-tight">
              Clothing & Textiles Directory
            </h1>
            <p className="text-xs text-slate-400">Verified Manufacturers, Wholesalers & Sellers</p>
          </div>
        </div>

        {/* User Account / Status Info & Create Button */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {isApproved ? '✓ APPROVED SELLER' : '⏳ PENDING APPROVAL'}
              </span>
              <Link href="/profile" className="text-xs font-semibold text-slate-300 hover:text-white">
                {user.fullName}
              </Link>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Sign In
            </Link>
          )}

          {/* "+ Create Clothing Product" Button (Triggers Approved Check) */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-500/25 transition text-xs flex items-center gap-1.5"
          >
            <span>+</span> Create Clothing Product
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Banner Section */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border-indigo-500/30 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Verified Clothing & Apparel Marketplace
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Source Directly from Super Admin Approved Clothing Vendors
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Explore factory catalogs, hot wholesale offers, and inspect vendor shop photos & videos. Only approved sellers can list products.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('HOT_SELLING')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <span>🔥</span> View Hot Selling Offers
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition"
            >
              List Your Clothing Shop ➔
            </button>
          </div>
        </div>

        {/* Search & Category Filter Navigation Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              👕 All Clothing
            </button>
            <button
              onClick={() => setActiveTab('HOT_SELLING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
                activeTab === 'HOT_SELLING'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-amber-400 hover:text-amber-300'
              }`}
            >
              <span>🔥</span> Hot Selling Offers
            </button>
            <button
              onClick={() => setActiveTab('ETHNIC')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'ETHNIC'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              💃 Ethnic & Kurtis
            </button>
            <button
              onClick={() => setActiveTab('MENS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'MENS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              👔 Men's Wear
            </button>
            <button
              onClick={() => setActiveTab('FABRIC')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'FABRIC'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              🧵 Fabrics & Rolls
            </button>
          </div>

          {/* Search Box */}
          <div className="relative md:w-72">
            <input
              type="text"
              placeholder="Search by title, SKU, fabric..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white pl-9 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Product Listing Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-semibold animate-pulse">
            ⏳ Loading clothing catalog & approved vendor profiles...
          </div>
        ) : isError ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-3xl border-rose-500/30">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="text-white font-bold text-base mb-1">Failed to Load Products</h3>
            <p className="text-xs mb-4">Make sure API server is running.</p>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
              Retry Search
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p: any) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center text-slate-400 rounded-3xl border-slate-800 space-y-4">
            <div className="text-4xl">👔</div>
            <h3 className="text-white font-bold text-base">No Clothing Products Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No products match the selected category filter or search query. Click below to add a new clothing product.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
            >
              + Create Clothing Product
            </button>
          </div>
        )}
      </main>

      {/* Selected Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start justify-center">
          <div className="w-full max-w-4xl relative my-auto">
            <ProductDetail
              initialProduct={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          </div>
        </div>
      )}

      {/* Create Clothing Product Modal */}
      <ClothingProductCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Verified Clothing & Textiles B2B Platform. Only Approved Users Can Create Products.
      </footer>
    </div>
  );
}
