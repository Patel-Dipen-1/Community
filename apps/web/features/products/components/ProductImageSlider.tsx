'use client';

import React, { useState } from 'react';
import { formatMediaUrl } from '../../../lib/utils/media';

interface ProductImageSliderProps {
  images: string[];
  title?: string;
  skuCode?: string;
}

export function ProductImageSlider({ images, title, skuCode }: ProductImageSliderProps) {
  const imageList = Array.isArray(images) && images.length > 0
    ? images.map((img) => formatMediaUrl(img))
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-3">
      {/* Main Image Slider View */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 group select-none">
        {/* Main Image */}
        <img
          src={imageList[activeIndex]}
          alt={title || `Product image ${activeIndex + 1}`}
          onClick={() => setIsFullscreen(true)}
          className="w-full h-80 md:h-96 object-cover cursor-pointer group-hover:scale-105 transition duration-500"
        />

        {/* Top Left SKU Overlay */}
        {skuCode && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-mono font-bold text-indigo-300 border border-slate-700">
            SKU: {skuCode}
          </div>
        )}

        {/* Top Right Counter Badge */}
        {imageList.length > 1 && (
          <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-200 border border-slate-700/80 shadow">
            📷 {activeIndex + 1} / {imageList.length}
          </div>
        )}

        {/* Navigation Arrows (Shown when more than 1 image) */}
        {imageList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg border border-slate-700/80 transition opacity-80 group-hover:opacity-100 shadow-xl"
              title="Previous Image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg border border-slate-700/80 transition opacity-80 group-hover:opacity-100 shadow-xl"
              title="Next Image"
            >
              ›
            </button>
          </>
        )}

        {/* Hover Lightbox Zoom Prompt */}
        <div
          onClick={() => setIsFullscreen(true)}
          className="absolute inset-0 bg-indigo-950/30 opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4 text-xs font-bold text-white cursor-pointer pointer-events-none"
        >
          🔍 Click to Inspect Fullscreen Image
        </div>
      </div>

      {/* Horizontal Thumbnail Strip */}
      {imageList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {imageList.map((imgUrl, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden border cursor-pointer flex-shrink-0 transition ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105'
                    : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[8px] font-mono font-bold text-slate-300 px-1 rounded-tl">
                  #{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
          <div className="flex justify-between items-center bg-slate-900 px-6 py-3.5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="font-extrabold text-white text-sm">
              Inspecting Image {activeIndex + 1} of {imageList.length} {skuCode ? `(${skuCode})` : ''}
            </h3>
            <button
              onClick={() => setIsFullscreen(false)}
              className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={imageList[activeIndex]}
              alt={`Fullscreen ${activeIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl"
            />

            {/* Lightbox Navigation Buttons */}
            {imageList.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/90 text-white font-bold text-2xl border border-slate-700 flex items-center justify-center hover:bg-indigo-600 transition"
                >
                  ‹
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/90 text-white font-bold text-2xl border border-slate-700 flex items-center justify-center hover:bg-indigo-600 transition"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnail Bar */}
          {imageList.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto p-2 bg-slate-900/80 rounded-2xl border border-slate-800 max-w-3xl mx-auto">
              {imageList.map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border cursor-pointer flex-shrink-0 transition ${
                    idx === activeIndex ? 'border-indigo-500 ring-2 ring-indigo-500' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
