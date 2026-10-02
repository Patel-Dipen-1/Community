'use client';

import React from 'react';
import { ChatMediaPreview } from './ChatMediaPreview';

interface BroadcastPreviewModalProps {
  isOpen: boolean;
  recipientCount: number;
  listTitle: string;
  text?: string;
  productCode?: string;
  attachedMediaList: { url: string; name: string }[];
  isVoiceNote?: boolean;
  voiceUrl?: string;
  onCancel: () => void;
  onConfirmSend: () => void;
  isSending: boolean;
}

export function BroadcastPreviewModal({
  isOpen,
  recipientCount,
  listTitle,
  text,
  productCode,
  attachedMediaList,
  isVoiceNote,
  voiceUrl,
  onCancel,
  onConfirmSend,
  isSending,
}: BroadcastPreviewModalProps) {
  if (!isOpen) return null;

  const imageCount = attachedMediaList.filter((m) => {
    const l = m.url.toLowerCase();
    return l.endsWith('.png') || l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.webp');
  }).length;

  const videoCount = attachedMediaList.filter((m) => {
    const l = m.url.toLowerCase();
    return l.endsWith('.mp4') || l.endsWith('.webm') || l.endsWith('.mov');
  }).length;

  const documentCount = attachedMediaList.filter((m) => {
    const l = m.url.toLowerCase();
    return l.endsWith('.pdf') || l.endsWith('.doc') || l.endsWith('.docx') || l.endsWith('.xls') || l.endsWith('.xlsx') || l.endsWith('.zip');
  }).length;

  const audioCount = attachedMediaList.filter((m) => {
    const l = m.url.toLowerCase();
    return l.endsWith('.mp3') || l.endsWith('.wav') || l.endsWith('.ogg');
  }).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
              📢
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Broadcast Preview</h3>
              <p className="text-xs text-emerald-100 font-medium">
                Target List: <strong className="text-white">{listTitle}</strong> ({recipientCount} contacts)
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSending}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Preview Content Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Each of the <strong>{recipientCount} contacts</strong> will receive these messages privately in their 1-to-1 conversation with you. No group chat will be created.
            </span>
          </div>

          {/* Content Summary Badges */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {text && (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg">
                💬 Text Message
              </span>
            )}
            {imageCount > 0 && (
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg">
                🖼️ {imageCount} Image{imageCount > 1 ? 's' : ''}
              </span>
            )}
            {videoCount > 0 && (
              <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg">
                📹 {videoCount} Video{videoCount > 1 ? 's' : ''}
              </span>
            )}
            {documentCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg">
                📎 {documentCount} Document{documentCount > 1 ? 's' : ''}
              </span>
            )}
            {audioCount > 0 && (
              <span className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg">
                🎧 {audioCount} Audio File{audioCount > 1 ? 's' : ''}
              </span>
            )}
            {isVoiceNote && (
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                🎤 1 Voice Note
              </span>
            )}
            {productCode && (
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-mono">
                📦 Product SKU: {productCode}
              </span>
            )}
          </div>

          {/* Message Text Preview */}
          {text && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
              {text}
            </div>
          )}

          {/* Voice Note Preview */}
          {isVoiceNote && voiceUrl && (
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
              <audio src={voiceUrl} controls className="w-full h-9" />
            </div>
          )}

          {/* Media Attachments Preview */}
          {attachedMediaList.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Attached Media ({attachedMediaList.length})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {attachedMediaList.map((media, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-36">
                    <ChatMediaPreview mediaUrl={media.url} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmSend}
            disabled={isSending}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            {isSending ? (
              <>
                <span className="animate-spin">⏳</span> Sending Broadcast...
              </>
            ) : (
              <>
                <span>🚀 Send to {recipientCount} Contacts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
