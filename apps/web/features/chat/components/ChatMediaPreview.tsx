'use client';

import React, { useState } from 'react';
import { VoiceWaveformPlayer } from './VoiceWaveformPlayer';
import { formatMediaUrl } from '../../../lib/utils/media';

interface ChatMediaPreviewProps {
  mediaUrl: string;
  senderName?: string;
}

export function ChatMediaPreview({ mediaUrl, senderName }: ChatMediaPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!mediaUrl) return null;

  const cleanUrl = formatMediaUrl(mediaUrl.trim());
  const lowerUrl = cleanUrl.toLowerCase();

  // Determine media category
  const isAudio =
    lowerUrl.includes('.mp3') ||
    lowerUrl.includes('.wav') ||
    lowerUrl.includes('.ogg') ||
    lowerUrl.includes('.m4a') ||
    lowerUrl.includes('.webm') && lowerUrl.includes('voice_note') ||
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
      (!lowerUrl.includes('.pdf') && !lowerUrl.includes('.doc') && !lowerUrl.includes('.xls') && !lowerUrl.includes('.zip')));

  const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');
  const isDoc = lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') || lowerUrl.includes('.word');
  const isSpreadsheet = lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.csv');
  const isZip = lowerUrl.endsWith('.zip') || lowerUrl.endsWith('.rar');

  // Extract filename from URL path
  const filename = cleanUrl.split('/').pop()?.split('?')[0] || 'Attachment';

  // Format filename for display
  const displayFilename = decodeURIComponent(filename).replace(/^[a-zA-Z0-9]+_\d+-/, '');

  return (
    <div className="my-1.5 w-full">
      {/* ============================================================ */}
      {/* 1. IMAGE PREVIEW — STRICT FIXED ASPECT BOX & ZERO CROPPING  */}
      {/* ============================================================ */}
      {isImage && !imageError && (
        <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md w-full max-w-[280px] sm:max-w-[320px] h-[220px] sm:h-[260px] flex items-center justify-center p-1.5">
          {/* Main Image with object-contain to strictly prevent cropping */}
          <img
            src={cleanUrl}
            alt={senderName ? `Media from ${senderName}` : 'Chat Attachment'}
            onError={() => setImageError(true)}
            onClick={() => setIsFullscreen(true)}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl cursor-pointer hover:opacity-95 transition"
            loading="lazy"
          />

          {/* Download / Fullscreen Hover Overlay Button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 z-10">
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-emerald-600 hover:text-slate-950 text-xs font-bold shadow-lg"
              title="Download Original Image"
            >
              📥
            </a>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-emerald-600 hover:text-slate-950 text-xs font-bold shadow-lg"
              title="Expand Image"
            >
              🔍
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VOICE NOTE AUDIO PLAYER CARD (WhatsApp Style Waveform)   */}
      {/* ============================================================ */}
      {isAudio && (
        <div className="my-1.5 w-full">
          <VoiceWaveformPlayer audioUrl={cleanUrl} senderName={senderName} />
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VIDEO PREVIEW — FIXED ASPECT BOX WITH CONTROLS           */}
      {/* ============================================================ */}
      {isVideo && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md w-full max-w-[280px] sm:max-w-[320px] h-[220px] sm:h-[260px] flex items-center justify-center p-1">
          <video
            src={cleanUrl}
            controls
            preload="metadata"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DOCUMENT / PDF / ZIP FILE CARD DISPLAY                   */}
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
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-[11px] flex-shrink-0 transition shadow"
          >
            Download
          </a>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={cleanUrl}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-4 flex items-center gap-4">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition"
                onClick={(e) => e.stopPropagation()}
              >
                📥 Download Full Resolution
              </a>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
