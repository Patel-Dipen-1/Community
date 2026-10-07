'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGetProfileQuery } from '../../../lib/redux/api/authApi';
import {
  useCreateProductMutation,
  useGetDynamicSchemaQuery,
  useSubmitCategoryRequestMutation,
} from '../../../lib/redux/api/productsApi';
import { FormModal } from '../../../components/forms/FormModal';
import { useToast } from '../../../components/common/Toast';
import { uploadSingleFile, uploadMultipleFiles } from '../../../lib/utils/upload';

interface ClothingProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct?: any) => void;
}

const FALLBACK_COMMUNITIES = [
  {
    id: 'clothing',
    name: '👕 Clothing',
    label: 'Clothing & Textiles Community',
    icon: '👕',
    categories: [{ id: 'ethnic-kurtis', name: 'Ethnic & Kurtis' }, { id: 'western-wear', name: 'Western Wear' }],
    specifications: [
      { key: 'FABRIC', label: 'Fabric Type', inputType: 'SELECT', options: ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen'] },
      { key: 'SIZE', label: 'Available Sizes', inputType: 'MULTI_SELECT', options: ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'] },
      { key: 'FIT', label: 'Fit Type', inputType: 'SELECT', options: ['Regular Fit', 'Slim Fit', 'Oversized'] },
      { key: 'GENDER', label: 'Target Gender / Age', inputType: 'SELECT', options: ['Women', 'Men', 'Unisex', 'Kids'] },
      { key: 'SEASON', label: 'Season / Occasion', inputType: 'SELECT', options: ['Casual Wear', 'Festive / Wedding', 'Summer Collection'] },
    ],
  },
  {
    id: 'jewellery',
    name: '💎 Jewellery',
    label: 'Jewellery & Gems Community',
    icon: '💎',
    categories: [{ id: 'gold-jewellery', name: 'Gold Jewellery' }, { id: 'diamond-jewellery', name: 'Diamond Jewellery' }],
    specifications: [
      { key: 'JEWELLERY_PURITY', label: 'Metal / Gold Purity', inputType: 'SELECT', options: ['24K Pure Gold (999)', '22K BIS Hallmarked (916)', '18K Gold', '925 Sterling Silver'] },
      { key: 'JEWELLERY_GEMSTONE', label: 'Gemstone Type', inputType: 'SELECT', options: ['Solitaire Diamond', 'Certified Emerald', 'Pearl', 'Ruby', 'CZ'] },
      { key: 'JEWELLERY_CERT', label: 'Certification', inputType: 'SELECT', options: ['BIS Hallmarked', 'IGI Certified', 'GIA Certified'] },
    ],
  },
  {
    id: 'hardware',
    name: '🔧 Hardware',
    label: 'Hardware & Tools Community',
    icon: '🔧',
    categories: [{ id: 'power-tools', name: 'Power Tools' }, { id: 'hand-tools', name: 'Hand Tools' }],
    specifications: [
      { key: 'HARDWARE_MATERIAL', label: 'Material Grade', inputType: 'SELECT', options: ['Stainless Steel 304', 'High Carbon Steel', 'Brass', 'Alloy'] },
      { key: 'HARDWARE_WARRANTY', label: 'Warranty Period', inputType: 'SELECT', options: ['6 Months Brand Warranty', '1 Year Manufacturer Warranty', 'Lifetime Guarantee'] },
      { key: 'HARDWARE_POWER', label: 'Power Rating', inputType: 'SELECT', options: ['Manual / Non-Powered', '220V AC Heavy Duty', '18V Lithium Cordless'] },
    ],
  },
  {
    id: 'electronics',
    name: '⚡ Electronics',
    label: 'Electronics & Electricals',
    icon: '⚡',
    categories: [{ id: 'smartphones', name: 'Smartphones & Accessories' }, { id: 'audio', name: 'Audio & Speakers' }],
    specifications: [
      { key: 'ELEC_POWER', label: 'Power Source', inputType: 'SELECT', options: ['Battery Operated', '220V Mains Power', 'USB-C 5V'] },
      { key: 'ELEC_CONN', label: 'Connectivity Type', inputType: 'SELECT', options: ['Bluetooth 5.3', 'Wi-Fi 6', 'Wired USB-C'] },
      { key: 'ELEC_WARRANTY', label: 'Warranty Period', inputType: 'SELECT', options: ['6 Months Repair', '1 Year Brand Warranty'] },
    ],
  },
  {
    id: 'grocery',
    name: '🌾 Grocery',
    label: 'Grocery & FMCG Staples',
    icon: '🌾',
    categories: [{ id: 'spices', name: 'Spices & Masala' }, { id: 'grains', name: 'Grains & Pulses' }],
    specifications: [
      { key: 'GROCERY_PACK', label: 'Packaging Type', inputType: 'SELECT', options: ['Standard Pouch', 'Vacuum Sealed Pack', 'Jute Sack', 'Tin Can'] },
      { key: 'GROCERY_SHELF', label: 'Shelf Life', inputType: 'SELECT', options: ['3 Months', '6 Months', '12 Months'] },
      { key: 'GROCERY_CERT', label: 'Certification', inputType: 'SELECT', options: ['FSSAI Licensed & Certified', '100% Organic Certified'] },
    ],
  },
];

export function ClothingProductCreateModal({ isOpen, onClose, onSuccess }: ClothingProductCreateModalProps) {
  const { addToast } = useToast();
  const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const { data: dynamicSchemaData } = useGetDynamicSchemaQuery();
  const [submitCategoryRequest, { isLoading: isSubmittingRequest }] = useSubmitCategoryRequestMutation();

  const user = profileData?.user;
  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');

  const communitiesList = dynamicSchemaData?.communities?.length
    ? dynamicSchemaData.communities
    : FALLBACK_COMMUNITIES;

  const allowedCommunitiesList: string[] = (
    user?.business?.allowedCommunities ||
    (user as any)?.allowedCommunities ||
    ['clothing', 'hardware', 'jewellery', 'electronics', 'grocery']
  ).map((s: string) => String(s).toLowerCase());

  const visibleCommunities = communitiesList.filter((c: any) =>
    allowedCommunitiesList.includes(c.id.toLowerCase())
  );
  const displayCommunities = visibleCommunities.length > 0 ? visibleCommunities : communitiesList;

  // Active Selected Community & Category
  const [activeCommunityId, setActiveCommunityId] = useState<string>('clothing');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Dynamic Specs Values Map (specKey -> selectedValue or string[])
  const [specsState, setSpecsState] = useState<Record<string, any>>({});

  // Universal Product Base Fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`SKU-B2B-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [moq, setMoq] = useState<number>(20);

  // Hot Selling Offers & Price Tiers
  const [isHotSelling, setIsHotSelling] = useState(false);
  const [hotOfferText, setHotOfferText] = useState('🔥 20% OFF Special Wholesale Deal - Limited Stock!');
  const [priceTiers, setPriceTiers] = useState<Array<{ minQty: number; price: number }>>([
    { minQty: 20, price: 350 },
    { minQty: 100, price: 299 },
  ]);

  // Universal Product Media (Photos & Videos)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [presetPhotoUrl, setPresetPhotoUrl] = useState('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Custom Category/Spec Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<string>('CATEGORY');
  const [requestValue, setRequestValue] = useState('');

  // Current Active Community Object
  const currentComm = displayCommunities.find((c: any) => c.id === activeCommunityId) || displayCommunities[0];

  useEffect(() => {
    if (isOpen && currentComm) {
      const firstCommId = displayCommunities[0]?.id || 'clothing';
      setActiveCommunityId(firstCommId);
      const commObj = displayCommunities.find((c: any) => c.id === firstCommId) || displayCommunities[0];
      const firstCat = commObj?.categories?.[0]?.name || 'General';
      setSelectedCategory(firstCat);

      // Initialize default dynamic spec selections
      const initialSpecs: Record<string, any> = {};
      commObj?.specifications?.forEach((spec: any) => {
        if (spec.inputType === 'MULTI_SELECT') {
          initialSpecs[spec.key] = [spec.options[0], spec.options[1]].filter(Boolean);
        } else {
          initialSpecs[spec.key] = spec.options[0] || '';
        }
      });
      setSpecsState(initialSpecs);
    }
  }, [isOpen, user, dynamicSchemaData]);

  const handleCommunityChange = (commId: string) => {
    setActiveCommunityId(commId);
    const commObj = displayCommunities.find((c: any) => c.id === commId) || displayCommunities[0];
    const firstCat = commObj?.categories?.[0]?.name || 'General';
    setSelectedCategory(firstCat);

    const initialSpecs: Record<string, any> = {};
    commObj?.specifications?.forEach((spec: any) => {
      if (spec.inputType === 'MULTI_SELECT') {
        initialSpecs[spec.key] = [spec.options[0], spec.options[1]].filter(Boolean);
      } else {
        initialSpecs[spec.key] = spec.options[0] || '';
      }
    });
    setSpecsState(initialSpecs);
  };

  const handleSpecSelect = (key: string, val: string, isMulti: boolean) => {
    if (isMulti) {
      const currentList: string[] = Array.isArray(specsState[key]) ? specsState[key] : [];
      if (currentList.includes(val)) {
        setSpecsState({ ...specsState, [key]: currentList.filter((v) => v !== val) });
      } else {
        setSpecsState({ ...specsState, [key]: [...currentList, val] });
      }
    } else {
      setSpecsState({ ...specsState, [key]: val });
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setPhotoFiles((prev) => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setVideoFile(selectedFile);
      setVideoPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleCustomRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestValue.trim()) return;

    try {
      await submitCategoryRequest({
        type: requestType,
        value: requestValue.trim(),
      }).unwrap();

      addToast(`🎉 Request for '${requestValue.trim()}' submitted to Super Admin! Status: PENDING.`, 'success');
      setIsRequestModalOpen(false);
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to submit request'}`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApproved) {
      addToast('🔒 Only Super Admin approved vendors can create products.', 'warning');
      return;
    }

    if (!title || !code || !description) {
      addToast('⚠️ Please fill out required fields (Title, SKU, Description).', 'warning');
      return;
    }

    let uploadedImageUrls: string[] = presetPhotoUrl ? [presetPhotoUrl] : [];
    let uploadedVideoUrl: string | null = videoUrlInput.trim() || null;

    try {
      setIsUploadingMedia(true);

      if (photoFiles.length > 0) {
        setUploadStatusText(`⏳ Uploading ${photoFiles.length} photo file(s) to server...`);
        const serverPhotoUrls = await uploadMultipleFiles(photoFiles);
        uploadedImageUrls = [...uploadedImageUrls, ...serverPhotoUrls];
      }

      if (videoFile) {
        setUploadStatusText('⏳ Uploading product showcase video file to server...');
        const serverVidUrl = await uploadSingleFile(videoFile);
        uploadedVideoUrl = serverVidUrl;
      }

      setUploadStatusText('🚀 Registering product & saving multimedia to database...');

      const finalSpecs = {
        category: selectedCategory,
        ...specsState,
        ...(isHotSelling ? { hotOfferDetails: hotOfferText } : {}),
      };

      const payload = {
        title,
        code,
        description,
        communityId: activeCommunityId,
        categoryId: selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        moq: Number(moq) || 1,
        priceTiers,
        images: uploadedImageUrls,
        videoUrl: uploadedVideoUrl,
        isHotSelling,
        specs: finalSpecs,
      };

      const result = await createProduct(payload).unwrap();
      addToast('🎉 Product & multimedia published successfully!', 'success');
      if (onSuccess) onSuccess(result?.product);
      onClose();
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.message || 'Failed to create product';
      addToast(`❌ ${errMsg}`, 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 Create B2B Product Listing"
      subtitle="100% Dynamic API Schema with Universal Product Media & Price Tiers"
      maxWidth="2xl"
    >
      {isProfileLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
          ⏳ Checking seller verification status...
        </div>
      ) : !user ? (
        <div className="p-6 text-center bg-slate-900/90 rounded-2xl border border-amber-500/30">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="font-bold text-white text-base mb-1">Sign In Required</h3>
          <p className="text-xs text-slate-400 mb-4">
            You must be logged in as an approved vendor to list products.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
          >
            Sign In Now ➔
          </Link>
        </div>
      ) : !isApproved ? (
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/10">
            🔒
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              APPROVAL REQUIRED
            </span>
            <h3 className="text-lg font-extrabold text-white mt-2">Product Creation Locked</h3>
            <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              Super Admin approval is required before listing products in the marketplace.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Header Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-emerald-300 font-semibold">
                Verified Seller: {user.fullName} ({user.business?.shopName || 'Wholesale Store'})
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              APPROVED
            </span>
          </div>

          {/* 1. DYNAMIC INDUSTRY COMMUNITY SELECTOR */}
          <div>
            <label className="block text-slate-300 font-bold mb-2">Select Target Trade Community *</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {displayCommunities.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCommunityChange(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    activeCommunityId === c.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{c.icon || '📦'}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. UNIVERSAL PRODUCT INFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Product Name / Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cordless Impact Drill or Pure Silk Saree"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Product SKU / Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SKU-B2B-909"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Category in {currentComm.name}</label>
                <button
                  type="button"
                  onClick={() => { setRequestType(`CATEGORY_${activeCommunityId.toUpperCase()}`); setIsRequestModalOpen(true); }}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-bold underline"
                >
                  + Request Category
                </button>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                {currentComm?.categories?.map((cat: any) => (
                  <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Minimum Order Quantity (MOQ) *</label>
              <input
                type="number"
                required
                min={1}
                value={moq}
                onChange={(e) => setMoq(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Detailed Product Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete product details, dimensions, grade specifications, and packaging..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 3. UNIVERSAL MULTIMEDIA SECTION (PHOTOS & VIDEOS) - SHOWN IN EVERY CATEGORY */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="font-extrabold text-white text-xs flex items-center justify-between">
              <span>📸 Product Media & Video Showcase (All Categories)</span>
              <span className="text-slate-400 text-[10px]">Multiple Photos + Video Upload</span>
            </h4>

            {/* Photo Upload */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Product Showcase Photos *</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              {/* Previews Grid */}
              <div className="flex flex-wrap gap-2 mt-3">
                {presetPhotoUrl && (
                  <div className="relative w-16 h-16 rounded-xl border border-indigo-500/50 overflow-hidden">
                    <img src={presetPhotoUrl} alt="Preset" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[8px] font-bold text-center py-0.5">
                      Main
                    </span>
                  </div>
                )}

                {photoPreviews.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden group">
                    <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Product Showcase Video (Optional MP4 / Link)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Or paste video URL (e.g. YouTube / MP4)"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                />
              </div>
              {videoPreview && (
                <div className="mt-2 text-indigo-400 font-bold text-[11px] flex items-center gap-2">
                  <span>🎥 Showcase Video selected for upload</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. DYNAMIC API SCHEMA SPECIFICATIONS & ATTRIBUTES CARD */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="font-extrabold text-white text-xs flex items-center justify-between">
              <span>🏷️ Dynamic Specifications & Attributes ({currentComm.name})</span>
              <button
                type="button"
                onClick={() => { setRequestType('SPEC'); setIsRequestModalOpen(true); }}
                className="text-amber-400 text-[10px] underline"
              >
                + Custom Spec Option
              </button>
            </h4>

            {currentComm?.specifications?.map((spec: any) => {
              const isMulti = spec.inputType === 'MULTI_SELECT';
              const currentValue = specsState[spec.key];

              return (
                <div key={spec.key} className="space-y-1.5 border-t border-slate-800/80 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                      <span>{spec.label}</span>
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
                        {spec.key}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setRequestType(spec.key); setIsRequestModalOpen(true); }}
                      className="text-amber-400 hover:text-amber-300 text-[10px] font-bold"
                    >
                      + Custom {spec.label}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {spec.options?.map((opt: string) => {
                      const selected = isMulti
                        ? Array.isArray(currentValue) && currentValue.includes(opt)
                        : currentValue === opt;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSpecSelect(spec.key, opt, isMulti)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            selected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUploadingMedia}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-lg shadow-indigo-600/30"
            >
              <span>{isCreating ? 'Publishing...' : '🚀 Publish Product'}</span>
            </button>
          </div>
        </form>
      )}

      {/* CUSTOM REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-card max-w-sm w-full p-5 rounded-2xl border-indigo-500/40 bg-slate-950 space-y-4">
            <h4 className="font-extrabold text-white text-sm">Request Custom Option to Super Admin</h4>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Requested Value Text</label>
              <input
                type="text"
                value={requestValue}
                onChange={(e) => setRequestValue(e.target.value)}
                placeholder="E.g. 24K Pure Gold or 500 GSM"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsRequestModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400">
                Cancel
              </button>
              <button onClick={handleCustomRequestSubmit} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </FormModal>
  );
}
