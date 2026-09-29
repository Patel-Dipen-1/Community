'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_CONFIG } from '../../../lib/api/config';

interface RichProductSkuCardProps {
  productCode: string;
  onOpenDetails?: (product: any) => void;
  compact?: boolean;
}

export function RichProductSkuCard({
  productCode,
  onOpenDetails,
  compact = false,
}: RichProductSkuCardProps) {
  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProductData() {
      if (!productCode) return;
      try {
        setIsLoading(true);
        const res = await fetch(`${API_CONFIG.BASE_URL}/products/search?query=${encodeURIComponent(productCode)}`);
        const json = await res.json();

        if (isMounted) {
          if (json.products && json.products.length > 0) {
            // Find exact code match if possible, otherwise use first search result
            const match =
              json.products.find(
                (p: any) => p.code?.toLowerCase() === productCode.toLowerCase()
              ) || json.products[0];
            setProduct(match);
          } else {
            setProduct(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product for SKU card:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProductData();
    return () => {
      isMounted = false;
    };
  }, [productCode]);

  const handleShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}/product/${encodeURIComponent(productCode)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDetails && product) {
      onOpenDetails(product);
    } else {
      window.location.href = `/product/${encodeURIComponent(productCode)}`;
    }
  };

  const primaryImg =
    product?.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600';

  const categoryName =
    product?.category?.name || product?.specs?.category || 'ethnic---kurtis';
  const moqCount = product?.moq || 20;
  const titleStr = product?.title || `Attached Product SKU (${productCode})`;
  
  const priceStr = product?.priceTiers?.[0]?.price
    ? `₹${product.priceTiers[0].price} / pc`
    : product?.price
    ? `₹${product.price} / pc`
    : '₹350 / pc';

  const isActive = product?.isActive !== false;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col justify-between transition group hover:shadow-2xl max-w-xs sm:max-w-sm mt-2.5 text-slate-100 shadow-xl border-slate-800/80">
      <div>
        {/* Top Product Image Header */}
        <div className="relative h-48 bg-slate-950 overflow-hidden cursor-pointer" onClick={handleDetailsClick}>
          <img
            src={primaryImg}
            alt={titleStr}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />

          {/* Top-Left SKU Badge Pill */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className="px-3 py-1 rounded-xl bg-slate-950/85 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 backdrop-blur-md shadow">
              {productCode}
            </span>
          </div>

          {/* Top-Right Status Badge Pill */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold backdrop-blur-md shadow border ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[140px] font-medium">{categoryName}</span>
            <span className="font-extrabold text-slate-200">MOQ: {moqCount} pcs</span>
          </div>

          <h3
            onClick={handleDetailsClick}
            className="font-extrabold text-sm text-white line-clamp-2 leading-snug group-hover:text-emerald-400 cursor-pointer transition"
          >
            {titleStr}
          </h3>

          <p className="text-xs font-mono font-extrabold text-emerald-400">
            {priceStr}
          </p>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-3 pt-0 flex items-center gap-2 border-t border-slate-800/80 bg-slate-950/40 mt-1">
        <button
          type="button"
          onClick={handleDetailsClick}
          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow"
        >
          Details 👁️
        </button>

        <button
          type="button"
          onClick={handleShareLink}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition flex items-center justify-center relative"
          title="Share / Copy Product SKU Link"
        >
          {copied ? (
            <span className="text-emerald-400 font-bold text-[10px]">✓</span>
          ) : (
            <span>🔗</span>
          )}
        </button>
      </div>
    </div>
  );
}
