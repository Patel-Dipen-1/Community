'use client';

import React, { useState } from 'react';
import { VoiceWaveformPlayer } from './VoiceWaveformPlayer';
import { formatMediaUrl } from '../../../lib/utils/media';

interface ChatMediaPreviewProps {
  mediaUrl: string;
  senderName?: string;
}

export function ChatMediaPreview({ mediaUrl, senderName }: ChatMediaPreviewProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

  if (!mediaUrl) return null;

  const rawUrls = mediaUrl.split(',').map((u) => u.trim()).filter(Boolean);
  const cleanUrls = rawUrls.map((u) => formatMediaUrl(u));
  const primaryUrl = cleanUrls[0] || '';
  const lowerUrl = primaryUrl.toLowerCase();

  // Determine media category
  const isAudio =
    lowerUrl.includes('.mp3') ||
    lowerUrl.includes('.wav') ||
    lowerUrl.includes('.ogg') ||
    lowerUrl.includes('.m4a') ||
    (lowerUrl.includes('.webm') && lowerUrl.includes('voice_note')) ||
    lowerUrl.includes('/audios/') ||
    lowerUrl.includes('voice_note');

  const isVideo =
    !isAudio &&
    (lowerUrl.includes('.mp4') ||
      lowerUrl.includes('.webm') ||
      lowerUrl.includes('.mov') ||
      lowerUrl.includes('/videos/'));

  const isImage =
    !isAudio &&
    !isVideo &&
    (lowerUrl.includes('.jpg') ||
      lowerUrl.includes('.jpeg') ||
      lowerUrl.includes('.png') ||
      lowerUrl.includes('.webp') ||
      lowerUrl.includes('.gif') ||
      lowerUrl.includes('/images/') ||
      (!lowerUrl.includes('.pdf') &&
        !lowerUrl.includes('.doc') &&
        !lowerUrl.includes('.xls') &&
        !lowerUrl.includes('.zip')));

  const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');
  const isDoc = lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') || lowerUrl.includes('.word');
  const isSpreadsheet = lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.csv');
  const isZip = lowerUrl.endsWith('.zip') || lowerUrl.endsWith('.rar');

  const filename = primaryUrl.split('/').pop()?.split('?')[0] || 'Attachment';
  const displayFilename = decodeURIComponent(filename).replace(/^[a-zA-Z0-9]+_\d+-/, '');

  const totalCount = cleanUrls.length;
  const overflowCount = totalCount - 3;

  return (
    <div className="my-1.5 w-full">
      {/* ============================================================ */}
      {/* 1. WHATSAPP-STYLE MULTI-IMAGE ALBUM GRID & SINGLE IMAGE      */}
      {/* ============================================================ */}
      {isImage && !imageError && (
        <div className="w-full max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
          {/* CASE A: Single Image */}
          {totalCount === 1 && (
            <div
              onClick={() => setFullscreenIndex(0)}
              className="relative group h-[220px] sm:h-[260px] flex items-center justify-center p-1.5 cursor-pointer"
            >
              <img
                src={cleanUrls[0]}
                alt={senderName ? `Media from ${senderName}` : 'Attachment'}
                onError={() => setImageError(true)}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl hover:opacity-95 transition"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 z-10">
                <a
                  href={cleanUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-emerald-600 hover:text-slate-950 text-xs font-bold shadow-lg"
                  title="Download Image"
                >
                  📥
                </a>
              </div>
            </div>
          )}

          {/* CASE B: 2 Images Side-by-Side */}
          {totalCount === 2 && (
            <div className="flex gap-1 h-[180px] sm:h-[200px]">
              {cleanUrls.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setFullscreenIndex(idx)}
                  className="flex-1 h-full cursor-pointer overflow-hidden relative group"
                >
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* CASE C: 3 Images (1 Big Left + 2 Stacked Right) */}
          {totalCount === 3 && (
            <div className="flex gap-1 h-[200px] sm:h-[220px]">
              <div
                onClick={() => setFullscreenIndex(0)}
                className="flex-1 h-full cursor-pointer overflow-hidden relative"
              >
                <img
                  src={cleanUrls[0]}
                  alt="Photo 1"
                  className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  loading="lazy"
                />
              </div>
              <div className="w-1/2 h-full flex flex-col gap-1">
                <div
                  onClick={() => setFullscreenIndex(1)}
                  className="flex-1 cursor-pointer overflow-hidden relative"
                >
                  <img
                    src={cleanUrls[1]}
                    alt="Photo 2"
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                </div>
                <div
                  onClick={() => setFullscreenIndex(2)}
                  className="flex-1 cursor-pointer overflow-hidden relative"
                >
                  <img
                    src={cleanUrls[2]}
                    alt="Photo 3"
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CASE D: 4+ Images WhatsApp 2x2 Grid with +N Overlay (e.g. +21 for 25 photos) */}
          {totalCount >= 4 && (
            <div className="grid grid-cols-2 gap-1 h-[220px] sm:h-[240px]">
              {cleanUrls.slice(0, 4).map((url, idx) => {
                const isFourth = idx === 3;
                const showOverlay = isFourth && overflowCount > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setFullscreenIndex(idx)}
                    className="relative w-full h-full cursor-pointer overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {showOverlay && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                        <span className="text-2xl font-black">+{overflowCount}</span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          Photos
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Album Footer Banner */}
          {totalCount > 1 && (
            <div className="bg-slate-900 px-3 py-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                🖼️ WhatsApp Album
              </span>
              <span className="text-slate-400 font-semibold">{totalCount} Photos</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VOICE NOTE AUDIO PLAYER CARD                             */}
      {/* ============================================================ */}
      {isAudio && (
        <div className="my-1.5 w-full">
          <VoiceWaveformPlayer audioUrl={primaryUrl} senderName={senderName} />
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VIDEO PREVIEW                                            */}
      {/* ============================================================ */}
      {isVideo && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md w-full max-w-[280px] sm:max-w-[320px] h-[220px] sm:h-[260px] flex items-center justify-center p-1">
          <video
            src={primaryUrl}
            controls
            preload="metadata"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DOCUMENT / PDF / FILE ATTACHMENT CARD                    */}
      {/* ============================================================ */}
      {(!isImage || imageError) && !isVideo && !isAudio && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 w-full max-w-[280px] sm:max-w-[320px] flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl flex-shrink-0">
              {isPdf ? '📄' : isDoc ? '📝' : isSpreadsheet ? '📊' : isZip ? '📦' : '📎'}
            </div>
            <div className="truncate">
              <h5 className="font-bold text-xs text-white truncate" title={displayFilename}>
                {displayFilename}
              </h5>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                {isPdf ? 'PDF Document' : isDoc ? 'Word Document' : isSpreadsheet ? 'Excel Sheet' : isZip ? 'Zip Archive' : 'File Attachment'}
              </p>
            </div>
          </div>

          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-[11px] flex-shrink-0 transition shadow"
          >
            Download
          </a>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL WITH SWIPE / NAVIGATION */}
      {fullscreenIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4"
          onClick={() => setFullscreenIndex(null)}
        >
          {/* Top Bar Header */}
          <div className="w-full max-w-5xl flex items-center justify-between py-2 z-10">
            <span className="text-white font-extrabold text-sm bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
              Photo {fullscreenIndex + 1} of {totalCount}
            </span>
            <button
              onClick={() => setFullscreenIndex(null)}
              className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow"
            >
              Close ✕
            </button>
          </div>

          {/* Main Fullscreen Image Container */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {totalCount > 1 && (
              <button
                onClick={() => setFullscreenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : totalCount - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-emerald-500 text-white hover:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-xl z-20 transition"
              >
                ‹
              </button>
            )}

            <img
              src={cleanUrls[fullscreenIndex]}
              alt={`Fullscreen ${fullscreenIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />

            {/* Next Button */}
            {totalCount > 1 && (
              <button
                onClick={() => setFullscreenIndex((prev) => (prev !== null && prev < totalCount - 1 ? prev + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-emerald-500 text-white hover:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-xl z-20 transition"
              >
                ›
              </button>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="w-full max-w-5xl flex items-center justify-center gap-4 py-2 z-10">
            <a
              href={cleanUrls[fullscreenIndex]}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg transition"
              onClick={(e) => e.stopPropagation()}
            >
              📥 Download Original Photo ({fullscreenIndex + 1}/{totalCount})
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
