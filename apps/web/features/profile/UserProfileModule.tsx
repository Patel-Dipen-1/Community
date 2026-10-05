'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetProfileQuery, useUpdateProfileMutation } from '../../lib/redux/api/authApi';
import { useGetProductsQuery } from '../../lib/redux/api/productsApi';
import { FormModal } from '../../components/forms/FormModal';
import { useToast } from '../../components/common/Toast';
import { ClothingProductCreateModal } from '../products/components/ClothingProductCreateModal';
import { ProductDetail } from '../products/components/ProductDetail';
import { WhatsAppLayout } from '../../components/layout/WhatsAppLayout';
import { Avatar, Badge, Button, Input, Toggle, SkeletonLoader } from '../../components/common/UIComponents';

export function UserProfileModule() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Edit Modal & Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    mobileNumber: '',
    shopName: '',
    gstNumber: '',
    streetAddress: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Active Settings Sub-Tab
  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'business' | 'products' | 'media' | 'security'>('profile');

  // Fullscreen Lightbox Media State
  const [inspectingMedia, setInspectingMedia] = useState<{
    mediaList: any[];
    activeIndex: number;
  } | null>(null);

  // Check Local Authentication State & Session Warning
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    const warning = localStorage.getItem('session_warning');
    if (warning) {
      addToast(`⚠️ ${warning}`, 'warning');
      localStorage.removeItem('session_warning');
    }
  }, [addToast]);

  // Fetch Authenticated User's Profile
  const { data, isLoading, isError, refetch } = useGetProfileQuery(undefined, {
    skip: isAuthenticated === false,
  });

  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const user = data?.user;
  const business = user?.business;

  // Fetch Own Business Products
  const { data: productsData, isLoading: isMyProductsLoading, refetch: refetchMyProducts } = useGetProductsQuery(
    { businessId: business?.id },
    { skip: !business?.id }
  );

  const myProducts = productsData?.products || [];
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Initialize Edit Form when profile loads or modal opens
  const handleOpenEditModal = () => {
    if (user && business) {
      setEditForm({
        fullName: user.fullName || '',
        mobileNumber: user.mobileNumber || '',
        shopName: business.shopName || '',
        gstNumber: business.gstNumber !== 'N/A' ? business.gstNumber || '' : '',
        streetAddress: business.streetAddress || '',
        city: business.city || '',
        state: business.state || '',
        pincode: business.pincode || '',
      });
      setIsEditModalOpen(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateProfile(editForm).unwrap();
      if (res.error) {
        addToast(`⚠️ ${res.error}`, 'warning');
      } else {
        addToast('🎉 Profile updated successfully!', 'success');
        setIsEditModalOpen(false);
        refetch();
      }
    } catch {
      addToast('❌ Error updating profile', 'error');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    addToast('🚪 Signed out successfully', 'info');
    router.push('/login');
  };

  // Helper to check if media is video
  const checkIsVideo = (m: any) => {
    return (
      m?.mediaType === 'VIDEO' ||
      (m?.url && Boolean(m.url.match(/\.(mp4|webm|mov|avi)$/i))) ||
      (m?.url && m.url.includes('gtv-videos-bucket'))
    );
  };

  // Unauthenticated Guard Screen
  if (isAuthenticated === false) {
    return (
      <WhatsAppLayout activeTab="settings">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-slate-900 max-w-md w-full p-8 rounded-3xl border border-indigo-500/30 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl mx-auto border border-indigo-500/30">
              🔒
            </div>
            <h1 className="text-2xl font-extrabold text-white">Authentication Required</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please sign in to access your business profile and manage account settings.
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-slate-950 shadow-lg transition"
            >
              Sign In to Account ➔
            </Link>
          </div>
        </div>
      </WhatsAppLayout>
    );
  }

  return (
    <WhatsAppLayout activeTab="settings">
      <div className="flex-1 flex h-full overflow-hidden relative">
        
        {/* LEFT SETTINGS SIDEBAR (WhatsApp Business Style Settings List) */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-full overflow-hidden">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-lg">
              ⚙️
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white leading-tight">Settings</h2>
              <p className="text-[11px] text-slate-400">Account & Business Preferences</p>
            </div>
          </div>

          {/* User Hero Avatar Section */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xl shadow-md border border-white/20">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm text-white truncate">{user?.fullName || 'Business User'}</h3>
              <p className="text-xs text-slate-400 truncate">{business?.shopName || 'Shop Profile'}</p>
              <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 mt-1">
                {user?.status === 'APPROVED' || user?.isVerified ? '✓ Verified Account' : 'Pending Verification'}
              </span>
            </div>
          </div>

          {/* Settings Navigation Menu Items */}
          <div className="flex-1 overflow-y-auto space-y-1 p-2">
            <button
              onClick={() => setActiveSettingsSection('profile')}
              className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                activeSettingsSection === 'profile'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">👤</span>
                <div>
                  <div className="font-bold">Profile Details</div>
                  <div className="text-[10px] text-slate-400 font-normal">Name, email, mobile number</div>
                </div>
              </div>
              <span>➔</span>
            </button>

            <button
              onClick={() => setActiveSettingsSection('business')}
              className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                activeSettingsSection === 'business'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🏬</span>
                <div>
                  <div className="font-bold">Business Specs & Location</div>
                  <div className="text-[10px] text-slate-400 font-normal">Shop name, GST number, address</div>
                </div>
              </div>
              <span>➔</span>
            </button>

            <button
              onClick={() => setActiveSettingsSection('products')}
              className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                activeSettingsSection === 'products'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">👕</span>
                <div>
                  <div className="font-bold">My Products Catalog</div>
                  <div className="text-[10px] text-slate-400 font-normal">{myProducts.length} published product SKUs</div>
                </div>
              </div>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">{myProducts.length}</span>
            </button>

            <Link
              href="/inquiries"
              className="w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between text-slate-300 hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📥</span>
                <div>
                  <div className="font-bold text-emerald-400">Product Callback Inquiries</div>
                  <div className="text-[10px] text-slate-400 font-normal">Private callback requests from buyers</div>
                </div>
              </div>
              <span className="text-emerald-400">➔</span>
            </Link>

            <button
              onClick={() => setActiveSettingsSection('media')}
              className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                activeSettingsSection === 'media'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📸</span>
                <div>
                  <div className="font-bold">Shop Inspection Reel</div>
                  <div className="text-[10px] text-slate-400 font-normal">{business?.media?.length || 0} photos/videos uploaded</div>
                </div>
              </div>
              <span>➔</span>
            </button>

            <button
              onClick={() => setActiveSettingsSection('security')}
              className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                activeSettingsSection === 'security'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🔒</span>
                <div>
                  <div className="font-bold">Privacy & Security</div>
                  <div className="text-[10px] text-slate-400 font-normal">Account verification & sessions</div>
                </div>
              </div>
              <span>➔</span>
            </button>
          </div>

          {/* Bottom Sign Out Button */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              🚪 Sign Out of Account
            </button>
          </div>
        </div>

        {/* RIGHT SETTINGS DETAIL DISPLAY AREA */}
        <div className="flex-1 bg-slate-950 h-full overflow-y-auto p-4 md:p-8 space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                WhatsApp Business Settings
              </span>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                {activeSettingsSection === 'profile' && '👤 Profile & Contact Details'}
                {activeSettingsSection === 'business' && '🏬 Business Specs & Location'}
                {activeSettingsSection === 'products' && '👕 Published Product Catalog'}
                {activeSettingsSection === 'media' && '📸 Shop Inspection Photos & Videos'}
                {activeSettingsSection === 'security' && '🔒 Privacy, Verification & Security'}
              </h2>
            </div>

            <button
              onClick={handleOpenEditModal}
              disabled={isLoading || !user}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              ✏️ Edit Profile
            </button>
          </div>

          {/* SECTION 1: PROFILE DETAILS */}
          {activeSettingsSection === 'profile' && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                👤 Personal & Account Information
              </h3>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">Owner Full Name</span>
                  <span className="text-white font-bold text-sm">{user?.fullName}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">Email Address (Login)</span>
                  <span className="text-emerald-400 font-mono font-bold">{user?.email}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">Mobile Contact</span>
                  <span className="text-slate-200 font-bold">{user?.mobileNumber}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">Account Status</span>
                  <span className="text-emerald-400 font-bold">{user?.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: BUSINESS SPECS */}
          {activeSettingsSection === 'business' && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                🏬 Business Profile & Address
              </h3>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">Shop / Business Name</span>
                  <span className="text-white font-bold text-sm">{business?.shopName || 'N/A'}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1 font-medium">GST Number</span>
                  <span className="text-indigo-400 font-mono font-bold">{business?.gstNumber || 'N/A'}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 sm:col-span-2">
                  <span className="text-slate-500 block mb-1 font-medium">Registered Address</span>
                  <span className="text-slate-200 font-medium">
                    {business?.streetAddress ? `${business.streetAddress}, ${business.city}, ${business.state} - ${business.pincode}` : 'Surat, Gujarat'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRODUCTS CATALOG */}
          {activeSettingsSection === 'products' && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  👕 My Published Products Catalog ({myProducts.length})
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow"
                >
                  + Create New SKU
                </button>
              </div>

              {isMyProductsLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Loading products...</div>
              ) : myProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {myProducts.map((p: any) => (
                    <div key={p.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'}
                          alt={p.title}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold inline-block mb-1">
                            {p.code}
                          </span>
                          <h4 className="font-bold text-white text-xs truncate">{p.title}</h4>
                          <p className="text-[10px] text-slate-400">MOQ: {p.moq} pcs</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                        >
                          🔍 Specs
                        </button>
                        <Link
                          href={`/chat?productCode=${encodeURIComponent(p.code)}`}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-slate-950 text-[11px] font-bold text-center"
                        >
                          💬 Share SKU
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-950 text-center text-slate-400 text-xs space-y-3">
                  <div className="text-3xl">👕</div>
                  <p className="font-semibold text-slate-300">You haven't listed any products yet.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs"
                  >
                    + Create Your First Product
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: MEDIA REEL */}
          {activeSettingsSection === 'media' && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                📸 Shop Inspection Photos & Media Reel ({business?.media?.length || 0})
              </h3>

              {business?.media && business.media.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {business.media.map((m: any, idx: number) => {
                    const isVid = checkIsVideo(m);
                    return (
                      <div
                        key={idx}
                        onClick={() => setInspectingMedia({ mediaList: business.media, activeIndex: idx })}
                        className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer hover:border-emerald-500 transition"
                      >
                        {isVid ? (
                          <video src={m.url} className="w-full h-32 object-cover pointer-events-none" />
                        ) : (
                          <img src={m.url} alt={`Media file ${idx + 1}`} className="w-full h-32 object-cover" />
                        )}
                        <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">
                          {isVid ? '🎥 Video' : '📷 Photo'} #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-950 text-center text-slate-500 text-xs">
                  No shop inspection photos uploaded.
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: SECURITY */}
          {activeSettingsSection === 'security' && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                🔒 Privacy & Security Status
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Account Verification Status</span>
                    <span className="text-[10px] text-slate-400">Super Admin verification status</span>
                  </div>
                  <span className="px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {user?.status}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Real-Time Messaging Permission</span>
                    <span className="text-[10px] text-slate-400">Allowed to send/receive messages</span>
                  </div>
                  <span className="px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✏️ Edit Profile Modal */}
      <FormModal
        isOpen={isEditModalOpen}
        title="✏️ Edit Business Profile Details"
        subtitle="Update your personal details and business location specs"
        maxWidth="xl"
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={editForm.mobileNumber}
                onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                value={editForm.shopName}
                onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">GST Number</label>
              <input
                type="text"
                value={editForm.gstNumber}
                onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow transition disabled:opacity-50"
            >
              {isUpdating ? 'Saving Profile...' : 'Save Profile Changes ➔'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Lightbox Modal */}
      {inspectingMedia && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6">
          <div className="flex justify-between items-center bg-slate-900 px-6 py-3.5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="font-extrabold text-white text-sm">
              Media {inspectingMedia.activeIndex + 1} of {inspectingMedia.mediaList.length}
            </h3>
            <button
              onClick={() => setInspectingMedia(null)}
              className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {checkIsVideo(inspectingMedia.mediaList[inspectingMedia.activeIndex]) ? (
              <video
                src={inspectingMedia.mediaList[inspectingMedia.activeIndex].url}
                controls
                autoPlay
                className="max-h-[65vh] max-w-full rounded-2xl border border-emerald-500/40 bg-black"
              />
            ) : (
              <img
                src={inspectingMedia.mediaList[inspectingMedia.activeIndex].url}
                alt="Media inspection"
                className="max-h-[65vh] max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
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
        onSuccess={() => refetchMyProducts()}
      />
    </WhatsAppLayout>
  );
}
