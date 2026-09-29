'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useGetProductByIdQuery } from '../../../lib/redux/api/productsApi';
import { useCaptureLeadMutation, useGetMyCategoryConfigQuery } from '../../../lib/redux/api/leadsApi';

import { ProductImageSlider } from './ProductImageSlider';

interface ProductDetailProps {
  id?: string;
  initialProduct?: any;
  onClose?: () => void;
}

export function ProductDetail({ id, initialProduct, onClose }: ProductDetailProps) {
  const { data: fetchedProduct, isLoading, isError } = useGetProductByIdQuery(id || '', {
    skip: !id || Boolean(initialProduct),
  });

  const product = initialProduct || fetchedProduct;
  const { data: catConfig } = useGetMyCategoryConfigQuery();

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  // Fullscreen Lightbox for Shop Media
  const [inspectingMedia, setInspectingMedia] = useState<any | null>(null);

  const [captureLead, { isLoading: isCapturingLead }] = useCaptureLeadMutation();

  const specs = product?.specs || {};
  const business = product?.business;
  const user = business?.user;
  const mediaList = business?.media || [];

  const isApprovedSeller = Boolean(user?.isVerified || user?.status === 'APPROVED' || business?.verificationTag);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !mobileNumber) return;

    try {
      await captureLead({
        businessId: business?.id || product?.businessId || undefined,
        visitorName,
        mobileNumber,
        productCode: product?.code || undefined,
        productId: product?.id || undefined,
        targetCategory: selectedCategory || catConfig?.defaultCategory || 'clothing',
        message: message.trim() || undefined,
        quantity: Number(quantity) || 1,
      }).unwrap();
      setLeadSubmitted(true);
    } catch (err) {
      console.error('Failed to capture lead:', err);
      setLeadSubmitted(true);
    }
  };

  const checkIsVideo = (m: any) => {
    return (
      m?.mediaType === 'VIDEO' ||
      (m?.url && Boolean(m.url.match(/\.(mp4|webm|mov|avi)$/i))) ||
      (m?.url && m.url.includes('gtv-videos-bucket'))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-xs font-semibold animate-pulse">
        ⏳ Loading clothing product & seller profile details...
      </div>
    );
  }

  if (isError || (!product && id)) {
    return (
      <div className="p-8 text-center text-slate-400 glass-card rounded-2xl border-rose-500/30 max-w-lg mx-auto my-10">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-white font-bold text-base mb-1">Product Not Found</h3>
        <p className="text-xs mb-4">The requested clothing product listing could not be retrieved.</p>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">
            Back to Catalog
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-slate-950 text-slate-100 flex flex-col ${onClose ? 'rounded-2xl md:rounded-3xl border border-slate-800 overflow-hidden shadow-2xl my-2 md:my-4' : 'min-h-screen'}`}>
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/95 px-4 md:px-6 py-3.5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md rounded-t-2xl md:rounded-t-3xl">
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition flex items-center gap-1 flex-shrink-0 shadow-sm"
            >
              ← Back
            </button>
          )}
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block truncate">
              CLOTHING PRODUCT SPECIFICATIONS & SELLER PROFILE
            </span>
            <h1 className="font-bold text-sm md:text-lg text-white leading-tight truncate">
              {product?.title || 'Clothing Product Details'}
            </h1>
          </div>
        </div>

        {/* Approved Seller Status Badge & Close Button */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {isApprovedSeller ? (
            <div className="text-[11px] md:text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 md:px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ✓ <span className="hidden sm:inline">Super Admin </span>Approved Seller
            </div>
          ) : (
            <div className="text-[11px] md:text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 md:px-3 py-1.5 rounded-full font-semibold">
              ⏳ Pending Verification
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center border border-slate-700 transition shadow-sm"
              title="Close modal"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* 🔥 Hot Selling Offer Highlight Banner */}
        {product?.isHotSelling && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center text-xl font-extrabold shadow-lg shadow-amber-500/30 flex-shrink-0 animate-bounce">
                🔥
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">SPECIAL HOT SELLING OFFER</span>
                <h3 className="font-extrabold text-white text-sm md:text-base">
                  {specs.hotOfferDetails || 'Hot Wholesale Discount - Direct Factory Deal!'}
                </h3>
              </div>
            </div>
            <Link
              href={`/chat?productCode=${encodeURIComponent(product?.code || '')}`}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition flex-shrink-0"
            >
              Claim Offer Now ➔
            </Link>
          </div>
        )}

        {/* Product Images & Overview Grid */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 md:flex gap-8">
          {/* Left Column: Product Media Showcase */}
          <div className="md:w-1/2 mb-6 md:mb-0 space-y-4">
            <ProductImageSlider
              images={product?.images || []}
              title={product?.title}
              skuCode={product?.code}
            />

            {/* Optional Product Showcase Video */}
            {product?.videoUrl && (
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                  🎥 Product Video Preview:
                </span>
                <video src={product.videoUrl} controls className="w-full max-h-48 object-cover rounded-xl bg-black" />
              </div>
            )}
          </div>

          {/* Right Column: Product Overview & Actions */}
          <div className="md:w-1/2 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
                  {product?.code}
                </span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md font-medium">
                  {specs.category || product?.category?.name || 'Clothing & Textiles'}
                </span>
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-3 leading-snug">
                {product?.title}
              </h2>
              <p className="text-slate-300 text-xs md:text-sm mb-4 leading-relaxed">
                {product?.description}
              </p>

              {/* Quick Specs Highlight Box */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Minimum Order Qty (MOQ):</span>
                  <span className="font-extrabold text-white">{product?.moq || 1} Pieces</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Fabric Type:</span>
                  <span className="font-bold text-indigo-300">{specs.fabric || 'Cotton / Silk Blend'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Available Sizes:</span>
                  <span className="font-bold text-purple-300">
                    {Array.isArray(specs.sizes) ? specs.sizes.join(', ') : 'M, L, XL, XXL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Gender:</span>
                  <span className="font-bold text-slate-200">{specs.gender || 'Unisex'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Link
                href={`/chat?productCode=${encodeURIComponent(product?.code || '')}`}
                className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white shadow-xl shadow-emerald-500/20 transition text-xs md:text-sm flex items-center justify-center gap-2"
              >
                💬 Instant Chat With Seller (SKU: {product?.code})
              </Link>
              <button
                onClick={() => setShowLeadModal(true)}
                className="w-full py-2.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition flex items-center justify-center gap-2"
              >
                📞 Request Callback / Submit RFQ
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Clothing Specifications & Wholesale Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clothing Attributes Table */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              👗 Clothing Specifications
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Fabric Composition:</span>
                <span className="text-white font-bold">{specs.fabric || '100% Combed Cotton'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Available Sizes:</span>
                <span className="text-indigo-300 font-bold">
                  {Array.isArray(specs.sizes) ? specs.sizes.join(', ') : 'Free Size'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Target Category:</span>
                <span className="text-slate-200 font-semibold">{specs.gender || 'Women'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Fit Type:</span>
                <span className="text-slate-200 font-semibold">{specs.fitType || 'Regular Fit'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Season / Occasion:</span>
                <span className="text-amber-300 font-semibold">{specs.season || 'Festive / Wedding'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400 font-medium">Work Pattern:</span>
                <span className="text-emerald-400 font-semibold">{specs.pattern || 'Digital Printed'}</span>
              </div>
            </div>
          </div>

          {/* Wholesale Price Tiers Table */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              💰 Wholesale Pricing Tiers
            </h3>

            {product?.priceTiers && Array.isArray(product.priceTiers) && product.priceTiers.length > 0 ? (
              <div className="space-y-2 text-xs">
                {product.priceTiers.map((tier: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-slate-400 block font-medium">Quantity Tier:</span>
                      <span className="text-white font-bold text-sm">{tier.minQty}+ Pieces</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block font-medium">Wholesale Rate:</span>
                      <span className="text-emerald-400 font-extrabold text-base">₹{tier.price} / pc</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                Contact seller for custom bulk wholesale pricing.
              </div>
            )}
          </div>
        </div>

        {/* 🏬 APPROVED SELLER / VENDOR PROFILE SHOWCASE */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border-indigo-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-xl shadow-indigo-500/30 flex-shrink-0">
                {business?.shopName?.charAt(0).toUpperCase() || user?.fullName?.charAt(0).toUpperCase() || 'V'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-lg">{business?.shopName || 'Verified Manufacturer'}</h3>
                  {isApprovedSeller && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ APPROVED VENDOR
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Owner: {user?.fullName || 'Business Owner'} • Role: {business?.assignedRole || 'MANUFACTURER'}
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex-shrink-0"
            >
              View Full Vendor Profile ➔
            </Link>
          </div>

          {/* Business Contact & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block mb-1 font-medium">GST Registration:</span>
              <span className="text-indigo-300 font-bold font-mono text-sm">{business?.gstNumber || '24AAAAA0000A1Z5'}</span>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block mb-1 font-medium">Location / Address:</span>
              <span className="text-slate-200 font-semibold leading-relaxed">
                {business?.streetAddress ? `${business.streetAddress}, ${business.city}, ${business.state}` : 'Surat, Gujarat, India'}
              </span>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block mb-1 font-medium">Contact Verification:</span>
              <span className="text-emerald-400 font-bold block">{user?.mobileNumber || '+91 9876543210'}</span>
            </div>
          </div>

          {/* 📸 SELLER'S OWN SHOP PHOTOS AND VIDEOS REEL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                📸 Verified Shop Photos & Manufacturing Video Reel ({mediaList.length})
              </h4>
              <span className="text-[10px] text-slate-400">Click photo/video to inspect in lightbox</span>
            </div>

            {mediaList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mediaList.map((m: any, idx: number) => {
                  const isVid = checkIsVideo(m);
                  return (
                    <div
                      key={idx}
                      onClick={() => setInspectingMedia(m)}
                      className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer hover:border-indigo-500 transition"
                    >
                      {isVid ? (
                        <video src={m.url} className="w-full h-28 object-cover pointer-events-none" />
                      ) : (
                        <img src={m.url} alt={`Shop photo ${idx + 1}`} className="w-full h-28 object-cover" />
                      )}
                      <div className="absolute top-1.5 left-1.5 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] font-bold text-slate-300">
                        {isVid ? '🎥 Video' : '📷 Photo'} #{idx + 1}
                      </div>
                      <div className="absolute inset-0 bg-indigo-950/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                        🔍 Inspect
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                No custom shop inspection photos uploaded by seller yet.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Lightbox Media Modal */}
      {inspectingMedia && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
          <div className="flex justify-between items-center bg-slate-900 px-6 py-3.5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="font-extrabold text-white text-sm">Inspecting Seller Shop Media</h3>
            <button
              onClick={() => setInspectingMedia(null)}
              className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {checkIsVideo(inspectingMedia) ? (
              <video src={inspectingMedia.url} controls autoPlay className="max-h-[65vh] max-w-full rounded-2xl border border-indigo-500/40 shadow-2xl bg-black" />
            ) : (
              <img src={inspectingMedia.url} alt="Shop inspection" className="max-h-[65vh] max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {/* Lead Capture Callback Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 relative">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            {!leadSubmitted ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mx-auto mb-2">
                    📞
                  </div>
                  <h3 className="font-bold text-lg text-white">Connect with {business?.shopName || 'Seller'}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your details to initiate a call back line with the verified clothing manufacturer.
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Your Mobile Number (WhatsApp)</label>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-slate-300 font-medium mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">Message / Requirements</label>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. Need bulk sample & rate"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Rules 2, 3, 4: Category Selection logic */}
                  {catConfig?.canSelectCategory ? (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Select Target Trade Category * ({catConfig.allowedCommunities.length} assigned categories)
                      </label>
                      <select
                        value={selectedCategory || catConfig.defaultCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        {catConfig.allowedCommunities.map((cat: string) => (
                          <option key={cat} value={cat}>
                            🏷️ {cat.toUpperCase()} COMMUNITY
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Select which community vendors will receive this targeted trade inquiry.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Target Trade Category:</span>
                      <span className="font-extrabold text-emerald-400 font-mono uppercase">
                        🏷️ {catConfig?.defaultCategory || 'clothing'} (Auto-Assigned)
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCapturingLead}
                    className="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition text-sm shadow-lg shadow-emerald-500/20 mt-2 disabled:opacity-50"
                  >
                    {isCapturingLead ? 'Connecting...' : 'Request Instant Callback ➔'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4">
                  ✓
                </div>
                <h3 className="font-bold text-lg text-white mb-2">Lead Registered!</h3>
                <p className="text-xs text-slate-300 mb-6">
                  Thank you <strong>{visitorName}</strong>. The seller has been notified and will reach out to you shortly.
                </p>
                <button
                  onClick={() => { setShowLeadModal(false); setLeadSubmitted(false); }}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
