'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useGetProfileQuery } from '../../../lib/redux/api/authApi';
import {
  useCreateProductMutation,
  useGetGlobalOptionsQuery,
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

const FABRIC_OPTIONS = ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen', 'Polyester Blend', 'Georgette', 'Velvet', 'Handloom Linen'];
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const GENDER_OPTIONS = ['Women', 'Men', 'Unisex', 'Kids'];
const FIT_OPTIONS = ['Regular Fit', 'Slim Fit', 'Oversized', 'Tailored Fit'];
const SEASON_OPTIONS = ['Casual Wear', 'Festive / Wedding', 'Formal Workwear', 'Summer Collection', 'Winter Special'];
const PATTERN_OPTIONS = ['Plain Solid', 'Digital Printed', 'Heavy Embroidery', 'Zari Work', 'Hand Block Printed', 'Chikan Work'];

export function ClothingProductCreateModal({ isOpen, onClose, onSuccess }: ClothingProductCreateModalProps) {
  const { addToast } = useToast();
  const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const { data: globalOptions } = useGetGlobalOptionsQuery();
  const [submitCategoryRequest, { isLoading: isSubmittingRequest }] = useSubmitCategoryRequestMutation();

  const user = profileData?.user;
  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');

  // Custom Category & Attribute Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'CATEGORY' | 'FABRIC' | 'GENDER' | 'FIT' | 'SEASON' | 'SIZE' | 'PATTERN'>('CATEGORY');
  const [requestValue, setRequestValue] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [customOptionsMap, setCustomOptionsMap] = useState<Record<string, string[]>>({});

  // Dynamic Options Lists (Defaults + Approved Global Options + User Local Requests)
  const categoriesList = Array.from(new Set([...(globalOptions?.categories || ['Ethnic & Kurtis', 'Sarees & Lehengas', "Men's Wear & Shirts", 'T-Shirts & Casuals', 'Denim & Trousers', 'Fabric Rolls & Trims', 'Kids & Toddlers Wear']), ...(customOptionsMap['CATEGORY'] || [])]));
  const fabricsList = Array.from(new Set([...(globalOptions?.fabrics || FABRIC_OPTIONS), ...(customOptionsMap['FABRIC'] || [])]));
  const sizesList = Array.from(new Set([...(globalOptions?.sizes || SIZE_OPTIONS), ...(customOptionsMap['SIZE'] || [])]));
  const gendersList = Array.from(new Set([...(globalOptions?.genders || GENDER_OPTIONS), ...(customOptionsMap['GENDER'] || [])]));
  const fitsList = Array.from(new Set([...(globalOptions?.fitTypes || FIT_OPTIONS), ...(customOptionsMap['FIT'] || [])]));
  const seasonsList = Array.from(new Set([...(globalOptions?.seasons || SEASON_OPTIONS), ...(customOptionsMap['SEASON'] || [])]));

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`SKU-CLOTH-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [moq, setMoq] = useState<number>(20);
  const [category, setCategory] = useState('Ethnic & Kurtis');
  
  // Clothing Specific Specs
  const [fabric, setFabric] = useState('100% Combed Cotton');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [gender, setGender] = useState('Women');
  const [fitType, setFitType] = useState('Regular Fit');
  const [season, setSeason] = useState('Festive / Wedding');
  const [pattern, setPattern] = useState('Digital Printed');

  const handleOpenRequestModal = (type: 'CATEGORY' | 'FABRIC' | 'GENDER' | 'FIT' | 'SEASON' | 'SIZE' | 'PATTERN') => {
    setRequestType(type);
    setRequestValue('');
    setRequestDesc('');
    setIsRequestModalOpen(true);
  };

  const handleCustomRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestValue.trim()) return;

    try {
      const val = requestValue.trim();
      await submitCategoryRequest({
        type: requestType,
        value: val,
        description: requestDesc.trim() || undefined,
      }).unwrap();

      setCustomOptionsMap((prev) => ({
        ...prev,
        [requestType]: [...(prev[requestType] || []), val],
      }));

      if (requestType === 'CATEGORY') setCategory(val);
      if (requestType === 'FABRIC') setFabric(val);
      if (requestType === 'GENDER') setGender(val);
      if (requestType === 'FIT') setFitType(val);
      if (requestType === 'SEASON') setSeason(val);
      if (requestType === 'SIZE' && !selectedSizes.includes(val)) setSelectedSizes([...selectedSizes, val]);

      addToast(`🎉 Custom ${requestType} request for '${val}' submitted to Super Admin! Status: PENDING.`, 'success');
      setIsRequestModalOpen(false);
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to submit request'}`, 'error');
    }
  };

  // Hot Selling Offers
  const [isHotSelling, setIsHotSelling] = useState(false);
  const [hotOfferText, setHotOfferText] = useState('🔥 20% OFF Special Wholesale Deal - Limited Stock!');

  // Pricing Tiers
  const [priceTiers, setPriceTiers] = useState<Array<{ minQty: number; price: number }>>([
    { minQty: 20, price: 350 },
    { minQty: 100, price: 299 },
  ]);

  // Media File Upload & URL State
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [presetPhotoUrl, setPresetPhotoUrl] = useState('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600');

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Handle Photo Local Selection
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setPhotoFiles((prev) => [...prev, ...selectedFiles]);

      // Generate local object URLs for instant thumbnail preview
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Video Local Selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setVideoFile(selectedFile);
      setVideoPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoUrlInput('');
  };

  const handleToggleSize = (sz: string) => {
    if (selectedSizes.includes(sz)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== sz));
    } else {
      setSelectedSizes([...selectedSizes, sz]);
    }
  };

  const handleAddPriceTier = () => {
    setPriceTiers([...priceTiers, { minQty: 50, price: 320 }]);
  };

  const handleRemovePriceTier = (idx: number) => {
    setPriceTiers(priceTiers.filter((_, i) => i !== idx));
  };

  // SUBMIT HANDLER: Upload local files first, then create product record in database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApproved) {
      addToast('🔒 Only Super Admin approved vendors can create clothing products.', 'warning');
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

      // STEP 1: Upload Product Photos to server if files selected
      if (photoFiles.length > 0) {
        setUploadStatusText(`⏳ Uploading ${photoFiles.length} photo file(s) to server...`);
        const serverPhotoUrls = await uploadMultipleFiles(photoFiles);
        uploadedImageUrls = [...uploadedImageUrls, ...serverPhotoUrls];
      }

      // STEP 2: Upload Showcase Video to server if file selected
      if (videoFile) {
        setUploadStatusText('⏳ Uploading product showcase video file to server...');
        const serverVidUrl = await uploadSingleFile(videoFile);
        uploadedVideoUrl = serverVidUrl;
      }

      if (uploadedImageUrls.length === 0) {
        addToast('⚠️ Please upload at least 1 product photo or select a photo URL.', 'warning');
        setIsUploadingMedia(false);
        return;
      }

      setUploadStatusText('🚀 Registering clothing product & saving multimedia to database...');

      // STEP 3: Create Product Record in Database
      const payload = {
        title,
        code,
        description,
        communityId: 'clothing',
        categoryId: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        moq: Number(moq) || 1,
        priceTiers,
        images: uploadedImageUrls,
        videoUrl: uploadedVideoUrl,
        isHotSelling,
        specs: {
          category,
          fabric,
          sizes: selectedSizes,
          gender,
          fitType,
          season,
          pattern,
          hotOfferDetails: isHotSelling ? hotOfferText : undefined,
        },
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
      title="👕 Create Clothing Product Listing"
      subtitle="Fill product data, upload photos & showcase video, then submit to database"
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
            You must be logged in as an approved vendor to list clothing products.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
          >
            Sign In Now ➔
          </Link>
        </div>
      ) : !isApproved ? (
        /* STRICT APPROVAL GUARD */
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/10">
            🔒
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              APPROVAL REQUIRED
            </span>
            <h3 className="text-lg font-extrabold text-white mt-2">
              Product Creation Locked for Unapproved Accounts
            </h3>
            <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              Super Admin approval is strictly required before listing products in the Clothing & Textiles community.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left max-w-md mx-auto space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Account Owner:</span>
              <span className="font-bold text-white">{user.fullName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Status:</span>
              <span className="font-bold text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/30">
                ⏳ {user.status || 'UNVERIFIED'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Shop Name:</span>
              <span className="font-bold text-indigo-300">{user.business?.shopName || 'N/A'}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition"
            >
              Close Window
            </button>
          </div>
        </div>
      ) : (
        /* APPROVED USER PRODUCT CREATION & MULTIMEDIA UPLOAD FORM */
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Header Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">✓</span>
              <span className="text-emerald-300 font-semibold text-xs">
                Verified Vendor ({user.fullName} - {user.business?.shopName})
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              APPROVED SELLER
            </span>
          </div>

          {/* Upload & Database Submit Progress Indicator */}
          {isUploadingMedia && (
            <div className="bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-indigo-500/50 p-4 rounded-xl text-center space-y-2 animate-pulse">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-extrabold text-white text-xs">{uploadStatusText}</p>
              <p className="text-[10px] text-indigo-300">Please wait while multimedia files upload to server and save to database...</p>
            </div>
          )}

          {/* Basic Product Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Designer Heavy Silk Kurti Set"
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
                placeholder="e.g. SKU-CLOTH-505"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Clothing Category</label>
                <button
                  type="button"
                  onClick={() => handleOpenRequestModal('CATEGORY')}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-bold underline"
                >
                  + Request New Category
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Minimum Order Quantity (MOQ) *</label>
              <input
                type="number"
                min="1"
                required
                value={moq}
                onChange={(e) => setMoq(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Detailed Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe fabric GSM, weaving details, wash care, packaging specs..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Clothing Specific Attributes */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                👗 Clothing Specifications & Attributes
              </h4>
              <button
                type="button"
                onClick={() => handleOpenRequestModal('FABRIC')}
                className="text-amber-400 hover:text-amber-300 text-[10px] font-bold underline"
              >
                + Request Custom Attribute
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Fabric Type</label>
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal('FABRIC')}
                    className="text-purple-400 text-[10px] font-bold hover:underline"
                  >
                    + Custom
                  </button>
                </div>
                <select
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {fabricsList.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Target Gender / Age</label>
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal('GENDER')}
                    className="text-purple-400 text-[10px] font-bold hover:underline"
                  >
                    + Custom
                  </button>
                </div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {gendersList.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Fit Type</label>
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal('FIT')}
                    className="text-purple-400 text-[10px] font-bold hover:underline"
                  >
                    + Custom
                  </button>
                </div>
                <select
                  value={fitType}
                  onChange={(e) => setFitType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {fitsList.map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Season / Occasion</label>
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal('SEASON')}
                    className="text-purple-400 text-[10px] font-bold hover:underline"
                  >
                    + Custom
                  </button>
                </div>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {seasonsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400">Available Sizes (Click to toggle)</label>
                <button
                  type="button"
                  onClick={() => handleOpenRequestModal('SIZE')}
                  className="text-teal-400 hover:text-teal-300 text-[10px] font-bold underline"
                >
                  + Add Custom Size
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesList.map((sz) => {
                  const active = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleToggleSize(sz)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 🔥 Hot Selling Offer Section */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <h4 className="font-extrabold text-amber-300 text-xs">Hot Selling Offer Status</h4>
                  <p className="text-[10px] text-slate-400">Promote this product with a special discount tag in the Hot Offers showcase.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isHotSelling}
                onChange={(e) => setIsHotSelling(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {isHotSelling && (
              <div>
                <label className="block text-amber-300 font-semibold mb-1">Hot Offer Discount / Tag Text</label>
                <input
                  type="text"
                  value={hotOfferText}
                  onChange={(e) => setHotOfferText(e.target.value)}
                  placeholder="e.g. 🔥 FLAT 25% OFF on 100+ Pieces!"
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3.5 py-2 text-white font-medium focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Wholesale Pricing Tiers */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-200 text-xs">💰 Wholesale Bulk Price Tiers (₹ / Piece)</h4>
              <button
                type="button"
                onClick={handleAddPriceTier}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold border border-slate-700"
              >
                + Add Tier
              </button>
            </div>

            <div className="space-y-2">
              {priceTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">Tier #{idx + 1}:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Min Qty"
                    value={tier.minQty}
                    onChange={(e) => {
                      const updated = [...priceTiers];
                      updated[idx].minQty = Number(e.target.value);
                      setPriceTiers(updated);
                    }}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                  <span className="text-slate-400">+ pcs @ ₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Price"
                    value={tier.price}
                    onChange={(e) => {
                      const updated = [...priceTiers];
                      updated[idx].price = Number(e.target.value);
                      setPriceTiers(updated);
                    }}
                    className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold font-mono"
                  />
                  {priceTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePriceTier(idx)}
                      className="text-rose-400 hover:text-rose-300 font-bold text-xs px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 📸 PRODUCT PHOTOS MULTIMEDIA UPLOAD SECTION */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  📸 Product Photos (Upload Local Image Files)
                </h4>
                <p className="text-[10px] text-slate-400">Select local image files from your computer/device. Files will upload on submission.</p>
              </div>

              {/* Upload Input Button */}
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5">
                📁 Upload Local Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Thumbnails Preview Grid */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {photoPreviews.map((previewUrl, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 h-24">
                    <img src={previewUrl} alt={`Selected photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white font-bold text-xs flex items-center justify-center opacity-80 group-hover:opacity-100 transition shadow"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] text-slate-300 font-mono">
                      Photo #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* URL Fallback / Preset Image Option */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-slate-400 text-[11px] mb-1">Preset Cover Photo URL (Fallback option)</label>
              <input
                type="url"
                value={presetPhotoUrl}
                onChange={(e) => setPresetPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 🎥 PRODUCT SHOWCASE VIDEO MULTIMEDIA UPLOAD SECTION */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  🎥 Product Showcase Video (Upload Local Video File)
                </h4>
                <p className="text-[10px] text-slate-400">Select MP4/WebM video file (Max 50MB). Uploads on submission.</p>
              </div>

              {/* Video Upload Button */}
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5">
                🎥 Upload Local Video
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Video File Preview */}
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-semibold font-mono">
                    Selected Video: {videoFile?.name} ({Math.round((videoFile?.size || 0) / 1024 / 1024)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                  >
                    ✕ Remove Video
                  </button>
                </div>
                <video src={videoPreview} controls className="w-full max-h-44 object-cover rounded-lg bg-black" />
              </div>
            ) : (
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Or Video URL (Optional)</label>
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          {/* Footer Submit Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUploadingMedia}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white font-extrabold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isUploadingMedia || isCreating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading & Publishing...
                </>
              ) : (
                '🚀 Upload Media & Publish Product ➔'
              )}
            </button>
          </div>
        </form>
      )}

      {/* CUSTOM CATEGORY / ATTRIBUTE REQUEST MODAL POPUP */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  SUPER ADMIN APPROVAL FLOW
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  🏷️ Request New {requestType} Option
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              Submit your request to Super Admin. It will enter <span className="text-amber-400 font-bold">PENDING</span> status. Once Super Admin confirms, your requested <span className="text-amber-300 font-semibold">{requestType}</span> will be <span className="text-emerald-400 font-bold">automatically added globally</span> for all users on the platform!
            </p>

            <form onSubmit={handleCustomRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Requested {requestType} Name / Value *
                </label>
                <input
                  type="text"
                  required
                  value={requestValue}
                  onChange={(e) => setRequestValue(e.target.value)}
                  placeholder={
                    requestType === 'CATEGORY' ? 'e.g. Designer Western Wear' :
                    requestType === 'FABRIC' ? 'e.g. 100% Combed Cotton' :
                    requestType === 'FIT' ? 'e.g. Regular Fit' :
                    requestType === 'SEASON' ? 'e.g. Festive / Wedding' :
                    requestType === 'SIZE' ? 'e.g. 4XL or Free Size' : 'Enter custom name...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Optional Notes / Reason for Admin
                </label>
                <textarea
                  rows={2}
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  placeholder="e.g. Frequently asked by buyers in South India market"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest || !requestValue.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingRequest ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    '🚀 Submit Request to Super Admin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FormModal>
  );
}
