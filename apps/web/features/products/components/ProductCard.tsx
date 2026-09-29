'use client';

import React from 'react';
import Link from 'next/link';

interface ProductCardProps {
  product: any;
  onSelectProduct?: (product: any) => void;
}

export function ProductCard({ product, onSelectProduct }: ProductCardProps) {
  const specs = product?.specs || {};
  const business = product?.business;
  const user = business?.user;

  const imagesList = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'];

  const [currentImgIdx, setCurrentImgIdx] = React.useState(0);

  const isApprovedSeller = Boolean(user?.isVerified || user?.status === 'APPROVED' || business?.verificationTag);
  const hotOfferDetails = specs.hotOfferDetails || '🔥 Hot Wholesale Offer Available';

  // Calculate starting price from priceTiers or specs
  const startingPrice = product?.priceTiers?.[0]?.price
    ? `₹${product.priceTiers[0].price}`
    : product?.priceTiers?.length
    ? `₹${product.priceTiers[product.priceTiers.length - 1]?.price}`
    : 'Inquire';

  const handlePrevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="glass-card glass-card-hover rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between relative group">
      {/* Hot Selling Badge */}
      {product?.isHotSelling && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1 animate-pulse">
          <span>🔥</span> HOT SELLING OFFER
        </div>
      )}

      {/* Seller Approval Badge (Top Right) */}
      <div className="absolute top-3 right-3 z-10">
        {isApprovedSeller ? (
          <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Approved Seller
          </span>
        ) : (
          <span className="bg-slate-900/80 backdrop-blur-md text-slate-400 border border-slate-700 text-[9px] font-medium px-2 py-0.5 rounded-full">
            Seller Unverified
          </span>
        )}
      </div>

      <div>
        {/* Product Image Slider */}
        <div className="relative h-52 bg-slate-950 overflow-hidden cursor-pointer select-none group/img" onClick={() => onSelectProduct && onSelectProduct(product)}>
          <img
            src={imagesList[currentImgIdx]}
            alt={product?.title || 'Clothing product'}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

          {/* Card Prev/Next Slider Buttons */}
          {imagesList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm border border-slate-700 opacity-0 group-hover/img:opacity-100 transition shadow-lg z-20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm border border-slate-700 opacity-0 group-hover/img:opacity-100 transition shadow-lg z-20"
              >
                ›
              </button>
              <div className="absolute bottom-2 right-3 bg-slate-950/85 px-2 py-0.5 rounded text-[9px] font-bold text-slate-300 border border-slate-700">
                📷 {currentImgIdx + 1} / {imagesList.length}
              </div>
            </>
          )}

          {/* SKU Code Overlay */}
          <div className="absolute bottom-2 left-3 bg-slate-900/90 backdrop-blur px-2.5 py-0.5 rounded text-[10px] font-mono text-indigo-300 font-bold border border-slate-700">
            {product?.code || 'SKU-CLOTH'}
          </div>
        </div>

        {/* Product Information */}
        <div className="p-4 space-y-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              {specs.category || product?.category?.name || 'Clothing & Textiles'}
            </span>
            <h3
              onClick={() => onSelectProduct && onSelectProduct(product)}
              className="font-bold text-white text-sm line-clamp-1 hover:text-indigo-300 cursor-pointer transition"
            >
              {product?.title}
            </h3>
          </div>

          {/* Hot Selling Banner if active */}
          {product?.isHotSelling && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
              <span>🏷️</span>
              <span className="line-clamp-1">{hotOfferDetails}</span>
            </div>
          )}

          {/* Clothing Attributes Chips */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {specs.fabric && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                🧶 {specs.fabric}
              </span>
            )}
            {specs.gender && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                👤 {specs.gender}
              </span>
            )}
            {specs.sizes && Array.isArray(specs.sizes) && (
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                📏 {specs.sizes.join(', ')}
              </span>
            )}
          </div>

          {/* Price & MOQ Row */}
          <div className="flex justify-between items-end pt-1 border-t border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block">Starting Price:</span>
              <span className="font-extrabold text-emerald-400 text-sm">{startingPrice}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">MOQ:</span>
              <span className="font-bold text-slate-200 text-xs">{product?.moq || 1} pcs</span>
            </div>
          </div>

          {/* Seller / User Profile Snippet */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {business?.shopName?.charAt(0).toUpperCase() || user?.fullName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-200 text-[11px] truncate leading-tight">
                  {business?.shopName || user?.fullName || 'Verified Seller'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {business?.city ? `${business.city}, ${business.state || ''}` : 'Manufacturer'}
                </p>
              </div>
            </div>
            {business?.media?.length > 0 && (
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 flex-shrink-0">
                📸 {business.media.length} Photos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-4 pt-0 flex gap-2">
        <button
          onClick={() => onSelectProduct && onSelectProduct(product)}
          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
        >
          View Specs & Shop ➔
        </button>
        <button
          onClick={() => onSelectProduct && onSelectProduct(product)}
          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1"
          title="Connect with Seller / Request Callback"
        >
          📞 Connect
        </button>
        <Link
          href={`/chat?productCode=${encodeURIComponent(product?.code || '')}`}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1"
        >
          💬 Chat
        </Link>
      </div>
    </div>
  );
}
