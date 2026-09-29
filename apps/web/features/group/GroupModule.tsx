'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  useGetGroupsQuery,
  useGetGroupDetailsQuery,
  useGetSuggestedMembersQuery,
  useCreateGroupMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useSendGroupMessageMutation,
  useEditGroupMessageMutation,
  useBulkAddMembersMutation,
  useUpdateGroupSettingsMutation,
  useUpdateGroupCapacityMutation,
  useDeleteGroupMutation,
  usePromoteMemberMutation,
  useDemoteMemberMutation,
  useRemoveMemberMutation,
  useGetGlobalGroupCapacityQuery,
  GroupSummary,
  SuggestedMemberCandidate,
} from '../../lib/redux/api/groupsApi';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { WhatsAppLayout } from '../../components/layout/WhatsAppLayout';
import { Avatar, Badge, Button, Input, Toggle, SkeletonLoader } from '../../components/common/UIComponents';
import { getSocket, joinSocketGroup, registerSocketUser } from '../../lib/socket/socketClient';
import { ChatMediaPreview } from '../chat/components/ChatMediaPreview';
import { VoiceRecorder } from '../chat/components/VoiceRecorder';
import { RichProductSkuCard } from '../products/components/RichProductSkuCard';
import { ProductDetail } from '../products/components/ProductDetail';
import { uploadSingleFile, uploadMultipleFiles } from '../../lib/utils/upload';

export default function GroupModule() {
  const { data: profileData } = useGetProfileQuery();
  const currentUser = profileData?.user;
  const { data: groups, isLoading: isGroupsLoading, refetch: refetchGroups } = useGetGroupsQuery();
  const { data: globalCapData } = useGetGlobalGroupCapacityQuery();

  // Active selected group ID
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);

  // Group Details query
  const { data: groupDetails, isLoading: isDetailsLoading, refetch: refetchDetails } = useGetGroupDetailsQuery(
    selectedGroupId || '',
    { skip: !selectedGroupId }
  );

  // Real-Time Socket.IO Event Listener for instant Trade Group updates
  useEffect(() => {
    if (!currentUser?.id) return;
    registerSocketUser(currentUser.id);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedGroupId) return;
    joinSocketGroup(selectedGroupId);

    const s = getSocket();
    const handleReceiveGroupMessage = (incomingMsg: any) => {
      if (incomingMsg.groupId === selectedGroupId || !incomingMsg.groupId) {
        refetchDetails();
        refetchGroups();
      }
    };
    const handleEditGroupMessage = (data: any) => {
      if (data.groupId === selectedGroupId) {
        refetchDetails();
      }
    };

    s.on('receive_group_message', handleReceiveGroupMessage);
    s.on('edit_group_message', handleEditGroupMessage);
    return () => {
      s.off('receive_group_message', handleReceiveGroupMessage);
      s.off('edit_group_message', handleEditGroupMessage);
    };
  }, [selectedGroupId, refetchDetails, refetchGroups]);

  // Local Cleared At Timestamp for Clear Chat option
  const [clearedAtTimestamp, setClearedAtTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedGroupId) {
      setClearedAtTimestamp(null);
      return;
    }
    const key = `group_clearedAt_${selectedGroupId}`;
    const stored = localStorage.getItem(key);
    setClearedAtTimestamp(stored ? parseInt(stored, 10) : null);
  }, [selectedGroupId]);


  // RTK Query Mutations
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [joinGroup, { isLoading: isJoining }] = useJoinGroupMutation();
  const [leaveGroup, { isLoading: isLeaving }] = useLeaveGroupMutation();
  const [sendGroupMessage, { isLoading: isSending }] = useSendGroupMessageMutation();
  const [editGroupMessageMutation, { isLoading: isEditingGroupMsg }] = useEditGroupMessageMutation();
  const [bulkAddMembers, { isLoading: isBulkAdding }] = useBulkAddMembersMutation();
  const [updateGroupSettings, { isLoading: isUpdatingSettings }] = useUpdateGroupSettingsMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation();
  const [promoteMember, { isLoading: isPromoting }] = usePromoteMemberMutation();
  const [demoteMember, { isLoading: isDemoting }] = useDemoteMemberMutation();
  const [removeMember, { isLoading: isRemovingMember }] = useRemoveMemberMutation();

  // UI Navigation & View State
  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');
  const [showGroupInfoDrawer, setShowGroupInfoDrawer] = useState(false);
  const [groupFilterTab, setGroupFilterTab] = useState<'ALL' | 'MY' | 'BROADCAST'>('ALL');
  const [searchGroupQuery, setSearchGroupQuery] = useState('');

  // Media & Attachments State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedMediaList, setAttachedMediaList] = useState<{ url: string; name: string }[]>([]);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  // Edit Message State
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);

  // Create Group Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'GROUP' | 'BROADCAST'>('GROUP');
  const [newMaxCapacity, setNewMaxCapacity] = useState(40);
  const [onlyAdminCanPost, setOnlyAdminCanPost] = useState(false);
  const [hideMemberIdentity, setHideMemberIdentity] = useState(true);
  const [membersCanSeeMemberList, setMembersCanSeeMemberList] = useState(false);
  const [createError, setCreateError] = useState('');

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchAddInput, setSearchAddInput] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState<string[]>([]);
  const [addMemberMsg, setAddMemberMsg] = useState('');

  // Query Member Add Suggestions
  const { data: suggestionsData, isLoading: isSuggestionsLoading, refetch: refetchSuggestions } = useGetSuggestedMembersQuery(
    {
      groupId: selectedGroupId || '',
      search: searchAddInput,
      category: selectedCategoryFilter,
    },
    { skip: !showAddMemberModal || !selectedGroupId }
  );

  // Group Settings Drawer State
  const [settingsForm, setSettingsForm] = useState({
    hideMemberIdentity: true,
    membersCanSeeMemberList: false,
    onlyAdminCanPost: false,
    maxCapacity: 40,
    title: '',
    description: '',
  });

  // Message Input State
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState('');

  const isUserApproved = currentUser?.status === 'APPROVED' || Boolean(currentUser?.isVerified);

  // Handlers
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setMobileView('CHAT');
  };

  const handlePromoteMember = async (userId: string, fullName: string) => {
    if (!selectedGroupId) return;
    if (!confirm(`Are you sure you want to promote '${fullName}' to Group Admin? Only Super Admin APPROVED users can become Group Admins.`)) return;

    try {
      const res = await promoteMember({ groupId: selectedGroupId, userId }).unwrap();
      alert(res.message);
      refetchDetails();
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to promote member');
    }
  };

  const handleDemoteMember = async (userId: string, fullName: string) => {
    if (!selectedGroupId) return;
    if (!confirm(`Are you sure you want to demote Group Admin '${fullName}' to normal member?`)) return;

    try {
      const res = await demoteMember({ groupId: selectedGroupId, userId }).unwrap();
      alert(res.message);
      refetchDetails();
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to demote Group Admin');
    }
  };

  const handleRemoveMember = async (userId: string, fullName: string) => {
    if (!selectedGroupId) return;
    if (!confirm(`Are you sure you want to remove '${fullName}' from this group?`)) return;

    try {
      const res = await removeMember({ groupId: selectedGroupId, userId }).unwrap();
      alert(res.message);
      refetchDetails();
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to remove member');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!isUserApproved) {
      setCreateError('❌ Only Super Admin approved vendors can create groups.');
      return;
    }

    try {
      const res = await createGroup({
        title: newTitle,
        description: newDescription,
        type: newType,
        maxCapacity: Number(newMaxCapacity),
        onlyAdminCanPost,
        hideMemberIdentity,
        membersCanSeeMemberList,
      }).unwrap();

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      if (res.group?.id) {
        setSelectedGroupId(res.group.id);
        setMobileView('CHAT');
      }
    } catch (err: any) {
      setCreateError(err?.data?.error || err?.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      await joinGroup(groupId).unwrap();
      setSelectedGroupId(groupId);
      setMobileView('CHAT');
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    if (!confirm('Are you sure you want to leave this group? You will stop receiving messages.')) return;

    try {
      await leaveGroup(selectedGroupId).unwrap();
      setSelectedGroupId(null);
      setShowGroupInfoDrawer(false);
      setMobileView('LIST');
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    if (!confirm('Are you sure you want to DELETE this group? It will be removed for all members immediately.')) return;

    try {
      await deleteGroup(selectedGroupId).unwrap();
      setSelectedGroupId(null);
      setShowGroupInfoDrawer(false);
      setMobileView('LIST');
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to delete group');
    }
  };

  const handleOpenAddMemberModal = () => {
    setSelectedUserIdsToAdd([]);
    setSearchAddInput('');
    setSelectedCategoryFilter('ALL');
    setAddMemberMsg('');
    setShowAddMemberModal(true);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIdsToAdd.includes(userId)) {
      setSelectedUserIdsToAdd(selectedUserIdsToAdd.filter(id => id !== userId));
    } else {
      setSelectedUserIdsToAdd([...selectedUserIdsToAdd, userId]);
    }
  };

  const handleBulkAddSubmit = async () => {
    if (!selectedGroupId || selectedUserIdsToAdd.length === 0) return;
    setAddMemberMsg('');

    try {
      const res = await bulkAddMembers({
        groupId: selectedGroupId,
        userIds: selectedUserIdsToAdd,
      }).unwrap();

      setAddMemberMsg(`✅ ${res.message}`);
      setSelectedUserIdsToAdd([]);
      refetchDetails();
      refetchGroups();
      refetchSuggestions();
      setTimeout(() => setShowAddMemberModal(false), 1500);
    } catch (err: any) {
      setAddMemberMsg(`❌ ${err?.data?.error || err?.message || 'Failed to add members'}`);
    }
  };

  const handleOpenGroupInfo = () => {
    if (!groupDetails) return;
    setSettingsForm({
      hideMemberIdentity: groupDetails.hideMemberIdentity,
      membersCanSeeMemberList: groupDetails.membersCanSeeMemberList,
      onlyAdminCanPost: groupDetails.onlyAdminCanPost,
      maxCapacity: groupDetails.maxCapacity,
      title: groupDetails.title,
      description: groupDetails.description || '',
    });
    setShowGroupInfoDrawer(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    try {
      await updateGroupSettings({
        groupId: selectedGroupId,
        ...settingsForm,
      }).unwrap();

      refetchDetails();
      refetchGroups();
      alert('Group settings saved successfully.');
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to update settings');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadingFileName(`Uploading ${fileArray.length} file(s)...`);
    setUploadError(null);
    try {
      let uploadedUrls: string[] = [];
      if (fileArray.length === 1) {
        const url = await uploadSingleFile(fileArray[0]);
        uploadedUrls = [url];
      } else {
        uploadedUrls = await uploadMultipleFiles(fileArray);
      }

      const newItems = uploadedUrls.map((url, i) => ({
        url,
        name: fileArray[i]?.name || `File ${i + 1}`,
      }));

      setAttachedMediaList((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      setUploadError(err?.message || 'File upload failed');
    } finally {
      setUploadingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendVoiceNote = async (mediaUrl: string) => {
    setIsVoiceRecorderOpen(false);
    if (!selectedGroupId) return;
    try {
      await sendGroupMessage({
        groupId: selectedGroupId,
        mediaUrl,
      }).unwrap();
      refetchDetails();
      refetchGroups();
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to send voice note');
    }
  };

  const handleClearChat = () => {
    if (!selectedGroupId) return;
    if (confirm('Clear group chat history for yourself? (Other group members and group details will remain unchanged)')) {
      const now = Date.now();
      localStorage.setItem(`group_clearedAt_${selectedGroupId}`, String(now));
      setClearedAtTimestamp(now);
      setShowGroupInfoDrawer(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    if (!messageText.trim() && attachedMediaList.length === 0) return;
    setSendError('');

    if (editingMessage) {
      try {
        await editGroupMessageMutation({
          messageId: editingMessage.id,
          text: messageText,
        }).unwrap();

        const s = getSocket();
        s.emit('edit_group_message', {
          messageId: editingMessage.id,
          text: messageText,
          groupId: selectedGroupId,
        });

        setEditingMessage(null);
        setMessageText('');
        refetchDetails();
      } catch (err: any) {
        setSendError(err?.data?.error || err?.message || 'Failed to edit message');
      }
      return;
    }

    try {
      if (attachedMediaList.length > 0) {
        const firstMedia = attachedMediaList[0];
        await sendGroupMessage({
          groupId: selectedGroupId,
          text: messageText.trim() || undefined,
          mediaUrl: firstMedia.url,
        }).unwrap();

        for (let i = 1; i < attachedMediaList.length; i++) {
          await sendGroupMessage({
            groupId: selectedGroupId,
            mediaUrl: attachedMediaList[i].url,
          }).unwrap();
        }

        setMessageText('');
        setAttachedMediaList([]);
        refetchDetails();
        refetchGroups();
      } else {
        await sendGroupMessage({
          groupId: selectedGroupId,
          text: messageText.trim() || undefined,
        }).unwrap();
        setMessageText('');
        refetchDetails();
        refetchGroups();
      }
    } catch (err: any) {
      setSendError(err?.data?.error || err?.message || 'Failed to send message');
    }
  };

  // Filter Groups List
  const filteredGroups = groups?.filter((g: GroupSummary) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchGroupQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchGroupQuery.toLowerCase());

    if (groupFilterTab === 'MY') return matchesSearch && g.isMember;
    if (groupFilterTab === 'BROADCAST') return matchesSearch && g.type === 'BROADCAST';
    return matchesSearch;
  });

  return (
    <WhatsAppLayout activeTab="groups">
      <div className="flex-1 flex h-full overflow-hidden relative">
        
        {/* ============================================================ */}
        {/* COLUMN 1: GROUPS LIST PANEL (WhatsApp Style Sidebar) */}
        {/* ============================================================ */}
        <div
          className={`${
            mobileView === 'CHAT' ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex-shrink-0 h-full overflow-hidden`}
        >
          {/* Header Bar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                👥
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white leading-tight">Trade Groups</h2>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  Default Limit: {globalCapData?.maxCapacity || 40} Max
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Create New Group"
            >
              <span className="text-base font-black">+</span> Group
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800">
            <div className="relative">
              <input
                type="text"
                placeholder="Search trade groups..."
                value={searchGroupQuery}
                onChange={(e) => setSearchGroupQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mt-2.5">
              <button
                onClick={() => setGroupFilterTab('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                  groupFilterTab === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Groups ({groups?.length || 0})
              </button>
              <button
                onClick={() => setGroupFilterTab('MY')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                  groupFilterTab === 'MY'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                My Joined
              </button>
              <button
                onClick={() => setGroupFilterTab('BROADCAST')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                  groupFilterTab === 'BROADCAST'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Broadcasts
              </button>
            </div>
          </div>

          {/* Groups List Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isGroupsLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading trade groups...</div>
            ) : filteredGroups?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No matching trade groups found.</div>
            ) : (
              filteredGroups?.map((grp: GroupSummary) => {
                const isSelected = selectedGroupId === grp.id;
                const capacityRatio = `${grp.currentMembersCount}/${grp.maxCapacity}`;

                return (
                  <div
                    key={grp.id}
                    onClick={() => handleSelectGroup(grp.id)}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {grp.title ? grp.title.charAt(0).toUpperCase() : '👥'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="font-bold text-xs text-white truncate">{grp.title}</h3>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold flex-shrink-0 ${
                            grp.isFull
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          👥 {capacityRatio}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-1">
                        {grp.description || 'Verified B2B wholesale trade group'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          {grp.hideMemberIdentity ? '🔒 Identity Masked' : '👤 Identity Public'}
                        </span>
                        {grp.isMember ? (
                          <span className="text-emerald-400 font-bold">Joined ✓</span>
                        ) : grp.isFull ? (
                          <span className="text-rose-400 font-bold">FULL</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinGroup(grp.id);
                            }}
                            disabled={isJoining}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMN 2: MAIN GROUP CHAT AREA (WhatsApp Style Interface) */}
        {/* ============================================================ */}
        <div
          className={`${
            mobileView === 'LIST' ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col bg-slate-950 h-full overflow-hidden`}
        >
          {!selectedGroupId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-4xl mb-4 border border-emerald-500/20 shadow-inner">
                👥
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Select a B2B Trade Group</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Connect directly with verified suppliers in interactive trade groups or broadcast channels with strict privacy controls.
              </p>
            </div>
          ) : isDetailsLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 animate-pulse">
              Loading group conversation...
            </div>
          ) : groupDetails ? (
            <>
              {/* WhatsApp Style Top Header Bar */}
              <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 z-10">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('LIST')}
                    className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    ←
                  </button>

                  <div
                    onClick={handleOpenGroupInfo}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-sm group-hover:border-emerald-500 transition">
                      {groupDetails.title ? groupDetails.title.charAt(0).toUpperCase() : '👥'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
                          {groupDetails.title}
                        </h2>
                        {groupDetails.isViewerAdmin && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                            👑 Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        👥 {groupDetails.currentMembersCount} / {groupDetails.maxCapacity} Members • Click for Group Info
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Action Icons & Settings Trigger */}
                <div className="flex items-center gap-2">
                  {groupDetails.isViewerAdmin && (
                    <button
                      onClick={handleOpenAddMemberModal}
                      disabled={groupDetails.isFull}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition flex items-center gap-1 shadow disabled:opacity-50"
                    >
                      ➕ Add Member
                    </button>
                  )}

                  <button
                    onClick={handleClearChat}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
                    title="Clear Group Chat History for yourself"
                  >
                    <span>🧹</span> Clear Chat
                  </button>

                  <button
                    onClick={handleOpenGroupInfo}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1"
                    title="Group Info & Settings"
                  >
                    <span>⚙️</span> Info
                  </button>
                </div>
              </div>

              {/* Sub-Header Privacy Rule Indicators */}
              <div className="bg-slate-900/60 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span>{groupDetails.hideMemberIdentity ? '🔒 Identity: Masked' : '👤 Identity: Public'}</span>
                  <span>•</span>
                  <span>{groupDetails.membersCanSeeMemberList ? '📋 Member List: Public' : '🔒 Member List: Admin Only'}</span>
                </div>
                <span className="text-emerald-400 font-semibold">
                  {groupDetails.onlyAdminCanPost ? '📢 Admin Broadcast Mode' : '💬 Interactive Discussion'}
                </span>
              </div>

              {/* Messages Container (WhatsApp Style Chat Area with 24h & Local Clear Filters) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {(() => {
                  const now = Date.now();
                  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                  const visibleMessages = (groupDetails.messages || []).filter((msg) => {
                    const msgTime = new Date(msg.createdAt).getTime();
                    if (now - msgTime > TWENTY_FOUR_HOURS_MS) return false;
                    if (clearedAtTimestamp && msgTime <= clearedAtTimestamp) return false;
                    return true;
                  });

                  if (visibleMessages.length === 0) {
                    return (
                      <div className="text-center py-16 text-xs text-slate-500">
                        No recent messages in this group (Messages auto-clear after 24 hours).
                      </div>
                    );
                  }

                  return visibleMessages.map((msg) => {
                    const isOwnMessage = msg.isSelf || msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label & Edit Button */}
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span
                            className={`text-[10px] font-semibold ${
                              groupDetails.isViewerAdmin
                                ? 'text-amber-400'
                                : isOwnMessage
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.isEdited && (
                            <span className="text-[9px] text-slate-400 italic">(edited)</span>
                          )}
                          {isOwnMessage && msg.text && (
                            <button
                              onClick={() => {
                                setEditingMessage({ id: msg.id, text: msg.text || '' });
                                setMessageText(msg.text || '');
                              }}
                              className="text-slate-400 hover:text-white text-[10px] ml-1 transition"
                              title="Edit message"
                            >
                              ✏️
                            </button>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isOwnMessage
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                          }`}
                        >
                          {msg.mediaUrl && (
                            <div className="mb-2">
                              <ChatMediaPreview mediaUrl={msg.mediaUrl} />
                            </div>
                          )}

                          {msg.text && <p>{msg.text}</p>}

                          {msg.productCode && (
                            <RichProductSkuCard
                              productCode={msg.productCode}
                              onOpenDetails={(prod) => setSelectedProductForDetail(prod)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Bottom Message Input Composer */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                  multiple
                  className="hidden"
                />

                {/* Edit Message Indicator Bar */}
                {editingMessage && (
                  <div className="flex items-center justify-between bg-purple-950/60 border border-purple-800/60 px-3 py-1.5 rounded-xl text-xs text-purple-200">
                    <span className="truncate">✏️ Editing message: "{editingMessage.text}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageText('');
                      }}
                      className="text-purple-400 hover:text-white font-bold text-sm ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Upload Progress Indicator */}
                {uploadingFileName && (
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs">
                    <span className="text-emerald-400 font-medium truncate">
                      ⏳ {uploadingFileName}
                    </span>
                  </div>
                )}

                {/* Multiple File Attachments List Preview Pills Bar */}
                {attachedMediaList.length > 0 && (
                  <div className="flex flex-col gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-indigo-500/40 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-400 font-bold">
                        📎 Attached ({attachedMediaList.length} gallery / document file{attachedMediaList.length > 1 ? 's' : ''}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedMediaList([])}
                        className="text-slate-400 hover:text-white text-[11px] font-bold"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {attachedMediaList.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-200 text-[11px]"
                        >
                          <span className="truncate max-w-[140px] font-medium">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachedMediaList((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-400 font-bold ml-1 text-xs"
                            title="Remove file"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="text-[11px] text-rose-400 px-2 font-medium">{sendError}</div>
                )}

                {groupDetails.onlyAdminCanPost && !groupDetails.isViewerAdmin ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    🔒 Only Group Admin can post messages in this broadcast channel.
                  </div>
                ) : !groupDetails.isMember ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
                    <span>You must join this group before posting messages.</span>
                    <button
                      type="button"
                      onClick={() => handleJoinGroup(groupDetails.id)}
                      disabled={groupDetails.isFull || isJoining}
                      className="px-4 py-1.5 bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-500"
                    >
                      Join Now
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Attach File / Gallery Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                      title="Share multiple gallery photos, videos, documents, or audio clips"
                    >
                      📎
                    </button>

                    {/* Record Voice Note Button */}
                    <button
                      type="button"
                      onClick={() => setIsVoiceRecorderOpen(true)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                      title="Record and send voice note"
                    >
                      🎙️
                    </button>

                    <input
                      type="text"
                      placeholder={editingMessage ? 'Edit your message...' : 'Type a group message...'}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 bg-slate-950 text-white text-xs px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    />

                    <button
                      type="submit"
                      disabled={isSending || isEditingGroupMsg || (!messageText.trim() && attachedMediaList.length === 0)}
                      className="px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition disabled:opacity-50 shadow-md"
                    >
                      {editingMessage ? 'Save Edit' : isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : null}
        </div>

        {/* ============================================================ */}
        {/* SLIDE-OVER / DRAWER: GROUP INFO & SETTINGS (WhatsApp Style) */}
        {/* ============================================================ */}
        {showGroupInfoDrawer && groupDetails && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto flex flex-col p-6 space-y-6 shadow-2xl animate-slideLeft">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>⚙️</span> Group Info & Settings
                </h3>
                <button
                  onClick={() => setShowGroupInfoDrawer(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Group Hero Avatar & Title */}
              <div className="text-center space-y-3 pb-4 border-b border-slate-800">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 text-indigo-300 font-extrabold flex items-center justify-center text-3xl mx-auto shadow-xl">
                  {groupDetails.title ? groupDetails.title.charAt(0).toUpperCase() : '👥'}
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-white">{groupDetails.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{groupDetails.description || 'Verified B2B Wholesale Group'}</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  👥 {groupDetails.currentMembersCount} / {groupDetails.maxCapacity} Members
                </div>
              </div>

              {/* Group Privacy & Rules Settings (For Group Admins) */}
              {groupDetails.isViewerAdmin && (
                <form onSubmit={handleSaveSettings} className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛡️</span> Group Admin Privacy Controls
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Group Title</label>
                    <input
                      type="text"
                      value={settingsForm.title}
                      onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Hide Member Identity</span>
                        <span className="text-[10px] text-slate-400">Normal members see anonymous sender name</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, hideMemberIdentity: !settingsForm.hideMemberIdentity })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          settingsForm.hideMemberIdentity ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {settingsForm.hideMemberIdentity ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Members Can See Member List</span>
                        <span className="text-[10px] text-slate-400">ON: Public list; OFF: Admin only</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, membersCanSeeMemberList: !settingsForm.membersCanSeeMemberList })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          settingsForm.membersCanSeeMemberList ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {settingsForm.membersCanSeeMemberList ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Only Admin Can Post</span>
                        <span className="text-[10px] text-slate-400">Broadcast mode: Only admins post</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, onlyAdminCanPost: !settingsForm.onlyAdminCanPost })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          settingsForm.onlyAdminCanPost ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {settingsForm.onlyAdminCanPost ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingSettings}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow"
                  >
                    {isUpdatingSettings ? 'Saving...' : 'Save Settings Changes'}
                  </button>
                </form>
              )}

              {/* Members Section Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Members — {groupDetails.currentMembersCount}/{groupDetails.maxCapacity}
                  </h4>
                  {groupDetails.isViewerAdmin && (
                    <button
                      onClick={handleOpenAddMemberModal}
                      disabled={groupDetails.isFull}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      + Add Member
                    </button>
                  )}
                </div>

                {!groupDetails.membersCanSeeMemberList && !groupDetails.isViewerAdmin ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center text-xs text-amber-300 space-y-1">
                    <div className="text-xl">🔒</div>
                    <p className="font-bold">Member List Hidden</p>
                    <p className="text-[11px] text-slate-400">
                      Group Admin has restricted member list visibility.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                    {groupDetails.members.map((m: any, idx: number) => {
                      const isSelf = m.userId === currentUser?.id;
                      const isAdminRole = m.roleInGroup === 'ADMIN';

                      return (
                        <div key={m.userId || idx} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                              {m.fullName ? m.fullName.charAt(0).toUpperCase() : '#'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{m.fullName}</span>
                                {isSelf && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded font-bold">You</span>}
                              </div>
                              <p className="text-[10px] text-slate-400">{m.mobileNumber || '••••••••••'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                isAdminRole
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isAdminRole ? '👑 Admin' : 'Member'}
                            </span>

                            {groupDetails.isViewerAdmin && !isSelf && (
                              <div className="flex items-center gap-1">
                                {!isAdminRole ? (
                                  <button
                                    onClick={() => handlePromoteMember(m.userId, m.fullName)}
                                    disabled={isPromoting}
                                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[9px] font-bold"
                                    title="Make Admin"
                                  >
                                    ⭐ Admin
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDemoteMember(m.userId, m.fullName)}
                                    disabled={isDemoting}
                                    className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[9px] font-bold"
                                    title="Demote"
                                  >
                                    ⬇️ Demote
                                  </button>
                                )}

                                <button
                                  onClick={() => handleRemoveMember(m.userId, m.fullName)}
                                  disabled={isRemovingMember}
                                  className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[9px] font-bold"
                                  title="Remove"
                                >
                                  ❌
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Group Action Buttons */}
              <div className="pt-4 border-t border-slate-800 space-y-2 mt-auto">
                <button
                  onClick={handleClearChat}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  🧹 Clear Group Chat History (Local)
                </button>

                {groupDetails.isMember && (
                  <button
                    onClick={handleLeaveGroup}
                    disabled={isLeaving}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
                  >
                    🚪 Leave Group
                  </button>
                )}

                {groupDetails.isViewerAdmin && (
                  <button
                    onClick={handleDeleteGroup}
                    disabled={isDeleting}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow"
                  >
                    🗑️ Delete Group (Admin Only)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL: VOICE RECORDER */}
        {/* ============================================================ */}
        {isVoiceRecorderOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <VoiceRecorder
                onSendVoiceNote={handleSendVoiceNote}
                onCancel={() => setIsVoiceRecorderOpen(false)}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL: ADD MEMBERS TO GROUP (WhatsApp Style Selector) */}
        {/* ============================================================ */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>➕</span> Add Members
                  </h3>
                  <p className="text-xs text-slate-400">Select candidates to invite to {groupDetails?.title}</p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Status Capacity Header Badge */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 flex-shrink-0">
                <span className="text-xs font-bold text-white">Capacity Status</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  👥 {suggestionsData?.currentMembersCount} / {suggestionsData?.maxCapacity} Members
                </span>
              </div>

              {addMemberMsg && (
                <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                  {addMemberMsg}
                </div>
              )}

              {/* SECTION 1: People You Chat With */}
              {suggestionsData?.chatContacts && suggestionsData.chatContacts.length > 0 && (
                <div className="space-y-1.5 flex-shrink-0 border-b border-slate-800 pb-3">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <span>💬</span> People You Chat With ({suggestionsData.chatContacts.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {suggestionsData.chatContacts.map((cand) => {
                      const isSelected = selectedUserIdsToAdd.includes(cand.userId);
                      return (
                        <div key={cand.userId} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              disabled={cand.isAlreadyMember || Boolean(suggestionsData?.isFull)}
                              checked={isSelected || cand.isAlreadyMember}
                              onChange={() => toggleUserSelection(cand.userId)}
                              className="rounded border-slate-700 text-emerald-600"
                            />
                            <div>
                              <h5 className="font-bold text-white text-xs">{cand.fullName}</h5>
                              <p className="text-[10px] text-slate-400">{cand.shopName} • {cand.mobileNumber || 'No Mobile'}</p>
                            </div>
                          </div>

                          {cand.isAlreadyMember ? (
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                              Already Added ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleUserSelection(cand.userId)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                isSelected ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {isSelected ? 'Selected ✓' : '+ Add'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: Search */}
              <div className="flex-shrink-0">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  🔍 Search Name or Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="Search by name or mobile number..."
                  value={searchAddInput}
                  onChange={(e) => setSearchAddInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                />
              </div>

              {/* SECTION 3: My Communities */}
              <div className="flex-shrink-0 space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  🏷️ My Communities / Categories
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategoryFilter === 'ALL' ? 'bg-emerald-600 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    All Communities
                  </button>
                  {suggestionsData?.communityCounts?.map((c) => (
                    <button
                      key={c.category}
                      onClick={() => setSelectedCategoryFilter(c.category)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        selectedCategoryFilter === c.category ? 'bg-emerald-600 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.label} ({c.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidates Selection List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px]">
                {isSuggestionsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading community members...</div>
                ) : suggestionsData?.suggestions?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No matching community members found.</div>
                ) : (
                  suggestionsData?.suggestions?.map((cand: SuggestedMemberCandidate) => {
                    const isSelected = selectedUserIdsToAdd.includes(cand.userId);
                    return (
                      <div
                        key={cand.userId}
                        onClick={() => {
                          if (!cand.isAlreadyMember && !suggestionsData?.isFull) {
                            toggleUserSelection(cand.userId);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          cand.isAlreadyMember
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-950/60 border-emerald-500/60'
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={cand.isAlreadyMember || Boolean(suggestionsData?.isFull)}
                            checked={isSelected || cand.isAlreadyMember}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-emerald-600"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-white">{cand.fullName}</h4>
                              <span className="text-[10px] text-slate-400">({cand.mobileNumber || 'No Mobile'})</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{cand.shopName}</p>
                          </div>
                        </div>

                        {cand.isAlreadyMember ? (
                          <span className="text-[10px] bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                            Already Added ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserSelection(cand.userId);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              isSelected ? 'bg-emerald-600 text-slate-950' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'Selected ✓' : '+ Add'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-slate-400">
                  Selected: <strong className="text-emerald-400">{selectedUserIdsToAdd.length}</strong> candidate(s)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBulkAdding || selectedUserIdsToAdd.length === 0 || Boolean(suggestionsData?.isFull)}
                    onClick={handleBulkAddSubmit}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg transition disabled:opacity-50"
                  >
                    {isBulkAdding ? 'Adding...' : `Add Selected Members (${selectedUserIdsToAdd.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL: CREATE NEW GROUP */}
        {/* ============================================================ */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>➕</span> Create B2B Trade Group
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {!isUserApproved ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-3">
                  <p className="font-bold">❌ Account Status must be APPROVED</p>
                  <p className="text-slate-300 leading-relaxed">
                    Only Super Admin approved vendor profiles can create trade groups.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  {createError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                      {createError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Group Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Surat Fabrics Wholesalers"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Trade guidelines..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Group Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="GROUP">💬 Interactive Group</option>
                        <option value="BROADCAST">📢 Admin Broadcast</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Max Capacity</label>
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-bold flex items-center justify-between">
                        <span>👥 {globalCapData?.maxCapacity || 40} Max</span>
                        <span className="text-[9px] text-purple-400 font-normal">Super Admin Set</span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Toggles */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Hide Member Identity</span>
                        <span className="text-[10px] text-slate-400">Sender names masked from regular members</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHideMemberIdentity(!hideMemberIdentity)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          hideMemberIdentity ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hideMemberIdentity ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Members Can See Member List</span>
                        <span className="text-[10px] text-slate-400">ON: Public list; OFF: Admin only</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMembersCanSeeMemberList(!membersCanSeeMemberList)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          membersCanSeeMemberList ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {membersCanSeeMemberList ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newTitle.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg transition disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Product Details Full Screen Modal Popup */}
        {selectedProductForDetail && (
          <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start justify-center">
            <div className="w-full max-w-4xl relative my-auto">
              <ProductDetail
                initialProduct={selectedProductForDetail}
                onClose={() => setSelectedProductForDetail(null)}
              />
            </div>
          </div>
        )}
      </div>
    </WhatsAppLayout>
  );
}
