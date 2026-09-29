'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateOwnerStoreMutation, StoreProfile } from '../../../lib/redux/api/storeApi';
import { useToast } from '../../../components/common/Toast';
import { uploadSingleFile } from '../../../lib/utils/upload';

interface EditStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreProfile;
}

export function EditStoreModal({ isOpen, onClose, store }: EditStoreModalProps) {
  const { addToast } = useToast();
  const [updateOwnerStore, { isLoading }] = useUpdateOwnerStoreMutation();

  const [name, setName] = useState(store.name || '');
  const [bio, setBio] = useState(store.bio || '');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl || '');
  const [isActive, setIsActive] = useState(store.isActive ?? true);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    if (store) {
      setName(store.name || '');
      setBio(store.bio || '');
      setLogoUrl(store.logoUrl || '');
      setBannerUrl(store.bannerUrl || '');
      setIsActive(store.isActive ?? true);
    }
  }, [store]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const url = await uploadSingleFile(file);
      setLogoUrl(url);
      addToast('Logo uploaded successfully!', 'success');
    } catch (err: any) {
      addToast(`Logo upload failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const url = await uploadSingleFile(file);
      setBannerUrl(url);
      addToast('Banner uploaded successfully!', 'success');
    } catch (err: any) {
      addToast(`Banner upload failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Store name is required', 'warning');
      return;
    }

    try {
      const res = await updateOwnerStore({
        name: name.trim(),
        bio: bio.trim() || undefined,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        isActive,
      }).unwrap();

      if (res.success) {
        addToast('Store settings updated successfully!', 'success');
        onClose();
      }
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Failed to update store';
      addToast(`Error: ${msg}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/20">
            🏬
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Store Settings & Branding</h3>
            <p className="text-xs text-slate-400">Manage public store profile, logo, banner and visibility</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Store Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Store / Catalog Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Textile Storefront"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Store Bio */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Store Description / Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell buyers about your manufacturing capabilities, terms, MOQ & wholesale deals..."
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {/* Store Logo Upload */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Store Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Store logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-700 bg-slate-950" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                  No Logo
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                  id="logo-upload-input"
                />
                <label
                  htmlFor="logo-upload-input"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer inline-block"
                >
                  {isUploadingLogo ? 'Uploading Logo...' : 'Choose Logo Image'}
                </label>
              </div>
            </div>
          </div>

          {/* Store Banner Upload */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Store Header Banner</label>
            <div className="space-y-2">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Store banner" className="w-full h-24 rounded-2xl object-cover border border-slate-700 bg-slate-950" />
              ) : (
                <div className="w-full h-20 rounded-2xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                  No Header Banner Image Set
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={isUploadingBanner}
                className="hidden"
                id="banner-upload-input"
              />
              <label
                htmlFor="banner-upload-input"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer inline-block"
              >
                {isUploadingBanner ? 'Uploading Banner...' : 'Choose Banner Image'}
              </label>
            </div>
          </div>

          {/* Store Visibility Active/Inactive */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Store Active Status</span>
              <span className="text-[11px] text-slate-400">
                {isActive ? 'Publicly visible to permitted community buyers' : 'Hidden from public directory and search'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-1.5 rounded-full font-extrabold text-xs transition ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isActive ? 'ACTIVE ✓' : 'INACTIVE 🔒'}
            </button>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isUploadingLogo || isUploadingBanner}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Store Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
