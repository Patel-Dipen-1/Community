'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useGetPosterStatusConfigQuery,
  useCreateStatusMutation,
  useGetStatusFeedQuery,
  useRecordStatusViewMutation,
  useGetStatusViewersQuery,
  useDeleteStatusMutation,
  StatusItem,
} from '../../lib/redux/api/statusApi';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { WhatsAppLayout } from '../../components/layout/WhatsAppLayout';
import { useToast } from '../../components/common/Toast';
import { uploadSingleFile } from '../../lib/utils/upload';

export function StatusModule() {
  const { addToast } = useToast();
  const { data: profileData } = useGetProfileQuery();
  const currentUser = profileData?.user;

  // Status API Queries & Mutations
  const { data: posterConfig } = useGetPosterStatusConfigQuery();
  const { data: feedData, isLoading, isError, refetch } = useGetStatusFeedQuery();
  const [createStatus, { isLoading: isPosting }] = useCreateStatusMutation();
  const [recordStatusView] = useRecordStatusViewMutation();
  const [deleteStatus, { isLoading: isDeleting }] = useDeleteStatusMutation();

  // Create Status Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'TEXT'>('TEXT');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Story Viewer Modal State
  const [activeStoryGroup, setActiveStoryGroup] = useState<StatusItem[] | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);

  const statuses = feedData?.statuses || [];
  const isSuperAdmin = feedData?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'dnpatel2002@gmail.com';
  const isApproved = Boolean(posterConfig?.isApproved || currentUser?.status === 'APPROVED' || currentUser?.isVerified);

  // Group statuses by poster
  const groupedStatuses: { [userId: string]: StatusItem[] } = {};
  statuses.forEach((st) => {
    if (!groupedStatuses[st.userId]) {
      groupedStatuses[st.userId] = [];
    }
    groupedStatuses[st.userId].push(st);
  });

  const posterIds = Object.keys(groupedStatuses);
  const myStatusList = groupedStatuses[currentUser?.id || ''] || [];

  // Initialize Category Selection for Create Status Form (Rules 3, 4, 5)
  useEffect(() => {
    if (posterConfig?.allowedCommunities) {
      setSelectedCategories([posterConfig.defaultCategory || 'clothing']);
    }
  }, [posterConfig]);

  // Handle File Selection & Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const url = await uploadSingleFile(file);
      setMediaUrl(url);
      const isVid = file.type.includes('video') || Boolean(file.name.match(/\.(mp4|webm|mov)$/i));
      setMediaType(isVid ? 'VIDEO' : 'IMAGE');
      addToast('📎 Status media uploaded successfully!', 'success');
    } catch (err: any) {
      addToast(`❌ Upload failed: ${err.message}`, 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Toggle Category Checkbox Selection (Rule 5: Multi-category selector)
  const handleToggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) {
        addToast('⚠️ Status must be posted to at least 1 assigned category.', 'warning');
        return;
      }
      setSelectedCategories(selectedCategories.filter((c) => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  // Submit New Status (Rules 1, 2, 3, 4, 5)
  const handlePostStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) {
      addToast('❌ Account Approval Required: Only Super Admin approved vendors can post WhatsApp status updates.', 'error');
      return;
    }

    if (!caption.trim() && !mediaUrl) {
      addToast('⚠️ Enter a text message or attach a media photo/video.', 'warning');
      return;
    }

    try {
      await createStatus({
        caption: caption.trim() || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? mediaType : 'TEXT',
        bgColor: mediaUrl ? undefined : bgColor,
        categories: selectedCategories,
      }).unwrap();

      addToast(`🟢 Status posted in [${selectedCategories.join(', ').toUpperCase()}]!`, 'success');
      setShowCreateModal(false);
      setCaption('');
      setMediaUrl(null);
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || err?.message || 'Failed to post status'}`, 'error');
    }
  };

  // Open Fullscreen Story Viewer (Rule 9: Record View)
  const handleOpenStoryViewer = (userStatusGroup: StatusItem[], startIdx = 0) => {
    setActiveStoryGroup(userStatusGroup);
    setActiveStoryIndex(startIdx);
    setShowViewersDrawer(false);

    // Record View for initial story
    if (userStatusGroup[startIdx]?.id) {
      recordStatusView(userStatusGroup[startIdx].id);
    }
  };

  const currentActiveStory = activeStoryGroup?.[activeStoryIndex];
  const isMyOwnActiveStory = currentActiveStory?.userId === currentUser?.id;

  // Query Viewers list for current story if drawer is open (Rule 9)
  const { data: viewersData } = useGetStatusViewersQuery(currentActiveStory?.id || '', {
    skip: !showViewersDrawer || !currentActiveStory?.id,
  });

  const handleDeleteActiveStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status update?')) return;
    try {
      await deleteStatus(statusId).unwrap();
      addToast('🗑️ Status deleted.', 'info');
      setActiveStoryGroup(null);
      refetch();
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || 'Failed to delete status'}`, 'error');
    }
  };

  return (
    <WhatsAppLayout activeTab="chats">
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col h-full overflow-y-auto">
        
        {/* Top App Header */}
        <header className="p-4 md:p-6 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-500/20">
              🟢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-extrabold text-white">
                  WhatsApp Trade Status
                </h1>
                {isSuperAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    🛡️ Super Admin View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSuperAdmin
                  ? 'Viewing all status updates across all categories & communities'
                  : 'Watch 24-hour status updates from verified vendors in your trade category'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <span className="text-base font-black">+</span> Add My Status
            </button>
            <button
              onClick={() => refetch()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
              title="Refresh status feed"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Main Feed Container */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          
          {/* Rules Banner Info */}
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="text-emerald-400 text-xl font-bold mt-0.5">🔒</div>
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-emerald-300 block">Category-Targeted Status Privacy</span>
              <p className="text-slate-300 leading-relaxed">
                • <strong>Only Approved Vendors</strong> can post WhatsApp Status updates.<br />
                • <strong>Targeted Watching:</strong> Statuses posted in <strong>CLOTHING</strong> can only be watched by Clothing members. Statuses posted in <strong>HARDWARE</strong> can only be watched by Hardware members. Vendors with multiple category access watch statuses from all their communities!
              </p>
            </div>
          </div>

          {/* SECTION 1: My Status Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  if (myStatusList.length > 0) handleOpenStoryViewer(myStatusList);
                  else setShowCreateModal(true);
                }}
                className="relative cursor-pointer group"
              >
                <div className={`w-14 h-14 rounded-full p-0.5 ${myStatusList.length > 0 ? 'bg-gradient-to-tr from-emerald-400 to-teal-500' : 'bg-slate-800'}`}>
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-extrabold text-white text-lg border-2 border-slate-900">
                    {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : '👤'}
                  </div>
                </div>
                {myStatusList.length === 0 && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                    +
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm text-white">My Status</h3>
                <p className="text-xs text-slate-400">
                  {myStatusList.length > 0
                    ? `${myStatusList.length} active status story (${new Date(myStatusList[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : 'Tap to add status update'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition"
            >
              + Post New
            </button>
          </div>

          {/* SECTION 2: Category WhatsApp Status Stories Ring Tray */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>📱</span> Recent Trade Status Updates ({posterIds.length})
            </h2>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading WhatsApp trade status updates...
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                Failed to load status updates. Please sign in again.
              </div>
            ) : posterIds.length === 0 ? (
              <div className="p-12 text-center glass-card rounded-3xl border-slate-800 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto">
                  🟢
                </div>
                <h3 className="font-bold text-base text-white">No Recent Status Updates</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Status updates posted by approved vendors in your assigned trade categories will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {posterIds.map((posterUserId) => {
                  const userStatuses = groupedStatuses[posterUserId];
                  const latest = userStatuses[0];
                  const isOwn = posterUserId === currentUser?.id;
                  const posterName = latest?.user?.fullName || latest?.business?.shopName || 'Vendor';

                  return (
                    <div
                      key={posterUserId}
                      onClick={() => handleOpenStoryViewer(userStatuses)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center text-center cursor-pointer transition group shadow-lg"
                    >
                      {/* Story Ring Circle */}
                      <div className="relative mb-3 group-hover:scale-105 transition transform">
                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 shadow-md">
                          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-extrabold text-white text-xl border-2 border-slate-900">
                            {posterName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-slate-950 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">
                          {userStatuses.length}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-emerald-300 transition">
                        {isOwn ? 'Your Status' : posterName}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {latest?.business?.shopName || 'Verified Vendor'}
                      </p>

                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {latest?.categories?.map((cat) => (
                          <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono font-bold">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MODAL 1: POST NEW STATUS (Rules 1, 2, 3, 4, 5) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>🟢</span> Post WhatsApp Status Update
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {!isApproved ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <p className="font-bold">❌ Account Approval Required</p>
                  <p className="text-slate-300 leading-relaxed">
                    Only Super Admin approved vendor profiles can post WhatsApp status updates to trade communities.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePostStatus} className="space-y-4 text-xs">
                  {/* Status Type Selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMediaType('TEXT'); setMediaUrl(null); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        mediaType === 'TEXT' ? 'bg-emerald-600 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      ✏️ Text Status
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        mediaType !== 'TEXT' ? 'bg-emerald-600 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      📷 Photo / Video
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      className="hidden"
                    />
                  </div>

                  {uploadingMedia && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-bold animate-pulse text-center">
                      ⏳ Uploading media file...
                    </div>
                  )}

                  {mediaUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-40 flex items-center justify-center">
                      {mediaType === 'VIDEO' ? (
                        <video src={mediaUrl} controls className="max-h-36 max-w-full" />
                      ) : (
                        <img src={mediaUrl} alt="Status preview" className="max-h-36 max-w-full object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaUrl(null)}
                        className="absolute top-2 right-2 bg-slate-950/80 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Text Status Background Color Picker */}
                  {!mediaUrl && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Background Color</label>
                      <div className="flex gap-2">
                        {['#0f172a', '#1e1b4b', '#064e3b', '#701a75', '#831843', '#451a03'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBgColor(c)}
                            className={`w-7 h-7 rounded-full border-2 transition ${bgColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caption / Text Input */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      {mediaUrl ? 'Caption / Text Note' : 'Status Message Text *'}
                    </label>
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Share wholesale arrival, new pricing, or product catalog update..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Rules 3, 4, 5: Category Selector Logic */}
                  {posterConfig?.canSelectMultipleCategories ? (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <label className="block text-slate-200 font-bold">
                        Post in which category? * (Select 1 or multiple)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {posterConfig.allowedCommunities.map((cat: string) => {
                          const isSelected = selectedCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleToggleCategory(cat)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-slate-950 border border-emerald-500 shadow'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              <span>{isSelected ? '✓' : '+'}</span>
                              <span>{cat.toUpperCase()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Target Trade Category:</span>
                      <span className="font-extrabold text-emerald-400 font-mono uppercase">
                        🏷️ {posterConfig?.defaultCategory || 'clothing'} (Auto-Assigned)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPosting || uploadingMedia}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg transition disabled:opacity-50"
                    >
                      {isPosting ? 'Posting...' : 'Post Status ➔'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: FULLSCREEN STORY VIEWER (Rules 6, 7, 8, 9 & Rule 10) */}
        {activeStoryGroup && currentActiveStory && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
            
            {/* Top Bar with Progress Indicators & Poster Profile */}
            <div className="space-y-3 z-10 max-w-md mx-auto w-full">
              {/* Progress Segmented Bar */}
              <div className="flex gap-1.5">
                {activeStoryGroup.map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full bg-emerald-400 transition-all ${
                        idx === activeStoryIndex ? 'w-full duration-5000' : idx < activeStoryIndex ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Poster Header Row */}
              <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm border border-indigo-400">
                    {currentActiveStory.user?.fullName?.charAt(0).toUpperCase() || 'V'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">
                      {currentActiveStory.user?.fullName || currentActiveStory.business?.shopName || 'Vendor'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {new Date(currentActiveStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Categories: {currentActiveStory.categories.join(', ').toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(isMyOwnActiveStory || isSuperAdmin) && (
                    <button
                      onClick={() => handleDeleteActiveStatus(currentActiveStory.id)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold border border-rose-500/30"
                      title="Delete Status"
                    >
                      🗑️
                    </button>
                  )}
                  <button
                    onClick={() => setActiveStoryGroup(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Media / Text Playback Screen */}
            <div
              className="relative flex-1 max-w-md mx-auto w-full my-4 rounded-3xl overflow-hidden border border-slate-800 flex flex-col justify-center items-center p-6 shadow-2xl"
              style={{ backgroundColor: currentActiveStory.bgColor || '#0f172a' }}
            >
              {currentActiveStory.mediaUrl ? (
                currentActiveStory.mediaType === 'VIDEO' ? (
                  <video src={currentActiveStory.mediaUrl} controls autoPlay className="max-h-[60vh] max-w-full rounded-2xl shadow-xl" />
                ) : (
                  <img src={currentActiveStory.mediaUrl} alt="Story" className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-xl" />
                )
              ) : null}

              {currentActiveStory.caption && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 backdrop-blur border border-slate-800 text-center max-w-sm">
                  <p className="text-white text-sm md:text-base font-bold leading-relaxed">
                    {currentActiveStory.caption}
                  </p>
                </div>
              )}

              {/* Prev / Next Story Tap Zones */}
              <button
                onClick={() => setActiveStoryIndex((prev) => Math.max(0, prev - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/60 text-white font-bold flex items-center justify-center text-lg border border-slate-700 hover:bg-slate-900"
              >
                ‹
              </button>
              <button
                onClick={() => setActiveStoryIndex((prev) => Math.min(activeStoryGroup.length - 1, prev + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/60 text-white font-bold flex items-center justify-center text-lg border border-slate-700 hover:bg-slate-900"
              >
                ›
              </button>
            </div>

            {/* Bottom Bar: Viewers Analytics Tray (Rule 9) */}
            <div className="max-w-md mx-auto w-full z-10">
              {isMyOwnActiveStory || isSuperAdmin ? (
                <button
                  onClick={() => setShowViewersDrawer(!showViewersDrawer)}
                  className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <span>👁️</span>
                  <span>Viewers ({currentActiveStory.views?.length || 0})</span>
                  <span>{showViewersDrawer ? '▼' : '▲'}</span>
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400 py-2">
                  🟢 Category WhatsApp Status Story
                </div>
              )}
            </div>

            {/* Rule 9: Viewers Drawer Overlay */}
            {showViewersDrawer && (isMyOwnActiveStory || isSuperAdmin) && (
              <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-3xl max-w-md mx-auto p-6 space-y-4 max-h-[50vh] overflow-y-auto shadow-2xl animate-slideUp">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>👁️</span> Status Viewers Analytics ({viewersData?.viewers?.length || 0})
                  </h4>
                  <button onClick={() => setShowViewersDrawer(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                    ✕
                  </button>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {viewersData?.viewers?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No vendor views recorded yet.
                    </div>
                  ) : (
                    viewersData?.viewers?.map((v) => (
                      <div key={v.viewerId} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/30">
                            {v.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-white">{v.fullName}</h5>
                            <p className="text-[10px] text-slate-400">{v.shopName} • {v.mobileNumber}</p>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-500">
                          {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WhatsAppLayout>
  );
}
