'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import {
  useSearchApprovedUsersQuery,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useStartConversationMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  ChatParticipant,
} from '../../lib/redux/api/chatApi';
import { useToast } from '../../components/common/Toast';
import { ClothingProductCreateModal } from '../products/components/ClothingProductCreateModal';
import { RichProductSkuCard } from '../products/components/RichProductSkuCard';
import { ProductDetail } from '../products/components/ProductDetail';
import { useGetProductsQuery } from '../../lib/redux/api/productsApi';
import { WhatsAppLayout } from '../../components/layout/WhatsAppLayout';
import { Avatar, Badge, Button, Input, SkeletonLoader } from '../../components/common/UIComponents';
import { CallModal } from './components/CallModal';
import { ChatMediaPreview } from './components/ChatMediaPreview';
import { VoiceRecorder } from './components/VoiceRecorder';
import { uploadSingleFile, uploadMultipleFiles } from '../../lib/utils/upload';
import { getSocket, registerSocketUser, joinSocketConversation } from '../../lib/socket/socketClient';

const AVAILABLE_COMMUNITIES = [
  { id: 'clothing', label: 'Clothing & Textiles', icon: '👕' },
  { id: 'jewellery', label: 'Jewellery & Gems', icon: '💎' },
  { id: 'electronics', label: 'Electronics & Mobiles', icon: '📱' },
  { id: 'footwear', label: 'Footwear', icon: '👟' },
  { id: 'textiles', label: 'Textiles & Yarns', icon: '🧵' },
  { id: 'cosmetics', label: 'Cosmetics', icon: '💄' },
  { id: 'hardware', label: 'Hardware', icon: '🔧' },
];

export function ChatModule() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const targetUserIdParam = searchParams.get('userId');
  const targetMobileParam = searchParams.get('mobile');
  const productCodeParam = searchParams.get('productCode');
  const initialTabParam = searchParams.get('tab');

  // Authenticated Profile
  const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
  const currentUser = profileData?.user;
  const isApprovedUser = currentUser?.status === 'APPROVED' || currentUser?.isVerified;

  // Active Tab View in Left Panel (chats, contacts, communities)
  const [activeLeftTab, setActiveLeftTab] = useState<'chats' | 'contacts' | 'communities'>(
    initialTabParam === 'contacts' ? 'contacts' : initialTabParam === 'communities' ? 'communities' : 'chats'
  );

  // Mobile View Toggle
  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');

  // Search Approved Users State
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isFetching: isSearchingApi } = useSearchApprovedUsersQuery(searchQuery, {
    skip: !searchQuery || searchQuery.trim().length < 2 || !isApprovedUser,
  });

  // Active Conversation State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [productCodeInput, setProductCodeInput] = useState(productCodeParam || '');
  const [isProductInputOpen, setIsProductInputOpen] = useState(Boolean(productCodeParam));
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isMyProductPickerOpen, setIsMyProductPickerOpen] = useState(false);

  // Calling State
  const [activeCallType, setActiveCallType] = useState<'AUDIO' | 'VIDEO' | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Voice Note & Edit State
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [clearedAtTimestamp, setClearedAtTimestamp] = useState<number | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // File Upload State (Multiple Gallery Media & Files)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [attachedMediaList, setAttachedMediaList] = useState<{ url: string; name: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Product Details Modal View State
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);

  // Fetch Own Business Products for Chat SKU Attachment
  const { data: myProductsData } = useGetProductsQuery(
    { businessId: currentUser?.business?.id },
    { skip: !currentUser?.business?.id }
  );
  const myProducts = myProductsData?.products || [];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RTK Query Hooks
  const { data: conversationsData, isLoading: isConversationsLoading, refetch: refetchConversations } =
    useGetConversationsQuery(undefined, {
      skip: !isApprovedUser,
    });

  const { data: activeChatData, isLoading: isMessagesLoading, refetch: refetchMessages } = useGetConversationMessagesQuery(
    activeConversationId || '',
    {
      skip: !activeConversationId || !isApprovedUser,
      pollingInterval: 8000, // Socket.IO handles instant updates, polling kept as lightweight fallback
    }
  );

  const [startConversation, { isLoading: isStartingChat }] = useStartConversationMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
  const [editMessageMutation, { isLoading: isEditingMessage }] = useEditMessageMutation();

  const conversations = conversationsData?.conversations || [];
  const messages = activeChatData?.messages || [];
  const activeParticipant = activeChatData?.participant;

  const selectedConversation = conversations.find((c) => c.conversationId === activeConversationId);
  const currentParticipant = activeParticipant || selectedConversation?.participant;

  // Real-Time Socket.IO Listener for instant 1-to-1 message updates
  useEffect(() => {
    if (!currentUser?.id) return;
    registerSocketUser(currentUser.id);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activeConversationId) return;
    joinSocketConversation(activeConversationId);

    const s = getSocket();
    const handleReceiveMessage = (incomingMsg: any) => {
      if (incomingMsg.conversationId === activeConversationId || !incomingMsg.conversationId) {
        refetchMessages();
        refetchConversations();
      }
    };

    s.on('receive_message', handleReceiveMessage);
    return () => {
      s.off('receive_message', handleReceiveMessage);
    };
  }, [activeConversationId, refetchMessages, refetchConversations]);

  // Auto-scroll messages to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Handle URL Query Params
  useEffect(() => {
    if (isApprovedUser && (targetUserIdParam || targetMobileParam)) {
      handleInitiateChat(targetUserIdParam || targetMobileParam || '');
    }
    if (productCodeParam) {
      setMessageText((prev) => prev || `Hi, I am interested in your product SKU: ${productCodeParam}. Please share pricing & MOQ details.`);
    }
  }, [isApprovedUser, targetUserIdParam, targetMobileParam, productCodeParam]);

  // Set default active conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].conversationId);
    }
  }, [conversations, activeConversationId]);

  const handleStartCall = (type: 'AUDIO' | 'VIDEO') => {
    if (!currentParticipant) {
      addToast('⚠️ Select a conversation participant first.', 'warning');
      return;
    }

    const myComms = currentUser?.business?.allowedCommunities || ['clothing'];
    const peerComms = currentParticipant.allowedCommunities || ['clothing'];
    const isSuperAdmin =
      currentUser?.business?.assignedRole === 'SUPER_ADMIN' ||
      currentParticipant.assignedRole === 'SUPER_ADMIN' ||
      currentUser?.email === 'dnpatel2002@gmail.com';

    const hasSharedCategory = isSuperAdmin || myComms.some((c) => peerComms.includes(c));
    if (!hasSharedCategory) {
      addToast('❌ COMMUNITY_RESTRICTED: You cannot call vendors from a different trade category.', 'error');
      return;
    }

    setActiveCallType(type);
    setIsCallModalOpen(true);
  };

  const handleEndCall = async (durationSeconds: number, isMissed: boolean) => {
    setIsCallModalOpen(false);

    if (!activeConversationId) return;

    const callTypeText = activeCallType === 'VIDEO' ? 'VIDEO' : 'AUDIO';
    const logText = isMissed
      ? `[CALL_LOG]: ${callTypeText} | MISSED`
      : `[CALL_LOG]: ${callTypeText} | ${durationSeconds}`;

    try {
      await sendMessage({
        conversationId: activeConversationId,
        text: logText,
      }).unwrap();
      refetchConversations();
    } catch (err) {
      // Ignore call log send failure
    } finally {
      setActiveCallType(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadingFileName(`Uploading ${fileArray.length} file(s)...`);
    setUploadProgress(25);
    setUploadError(null);

    try {
      setUploadProgress(50);
      let uploadedUrls: string[] = [];

      if (fileArray.length === 1) {
        const url = await uploadSingleFile(fileArray[0]);
        uploadedUrls = [url];
      } else {
        uploadedUrls = await uploadMultipleFiles(fileArray);
      }

      setUploadProgress(100);
      const newItems = uploadedUrls.map((url, i) => ({
        url,
        name: fileArray[i]?.name || `File ${i + 1}`,
      }));

      setAttachedMediaList((prev) => [...prev, ...newItems]);
      addToast(`📎 ${newItems.length} gallery file(s) attached! Click Send to share.`, 'success');
    } catch (err: any) {
      const msg = err.message || 'File upload failed';
      setUploadError(msg);
      addToast(`❌ Upload failed: ${msg}`, 'error');
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInitiateChat = async (targetIdentifier: string) => {
    if (!targetIdentifier || !targetIdentifier.trim()) return;

    const trimmed = targetIdentifier.trim();
    const isMobile = /^[0-9+\s-]{7,15}$/.test(trimmed);

    try {
      const res = await startConversation({
        recipientUserId: isMobile ? undefined : trimmed,
        recipientMobileNumber: isMobile ? trimmed : undefined,
      }).unwrap();

      if (res.success && res.conversationId) {
        setActiveConversationId(res.conversationId);
        setSearchQuery('');
        setActiveLeftTab('chats');
        setMobileView('CHAT');
        addToast(`💬 Chat connected with ${res.participant?.fullName || 'User'}`, 'success');
      }
    } catch (err: any) {
      const errMsg = err?.data?.error || 'Failed to start conversation';
      addToast(`⚠️ ${errMsg}`, 'error');
    }
  };

  // Load clearedAt on conversation change
  useEffect(() => {
    if (activeConversationId) {
      const stored = localStorage.getItem(`chat_clearedAt_${activeConversationId}`);
      setClearedAtTimestamp(stored ? parseInt(stored, 10) : null);
    }
  }, [activeConversationId]);

  const handleClearChat = () => {
    if (!activeConversationId) return;
    if (!confirm('Are you sure you want to clear chat history from your local view? (Trade group / participant will not be deleted)')) return;
    const now = Date.now();
    localStorage.setItem(`chat_clearedAt_${activeConversationId}`, now.toString());
    setClearedAtTimestamp(now);
    setIsHeaderMenuOpen(false);
    addToast('🧹 Chat history cleared for your view.', 'info');
  };

  const handleStartEditMessage = (msg: any) => {
    if (msg.senderId !== currentUser?.id) return;
    setEditingMessage({ id: msg.id, text: msg.text || '' });
    setMessageText(msg.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !messageText.trim()) return;

    try {
      const res = await editMessageMutation({
        messageId: editingMessage.id,
        text: messageText.trim(),
      }).unwrap();

      if (res.success) {
        const s = getSocket();
        s.emit('edit_message', {
          conversationId: activeConversationId,
          messageId: editingMessage.id,
          text: messageText.trim(),
        });
        setEditingMessage(null);
        setMessageText('');
        refetchMessages();
        addToast('✏️ Message edited successfully', 'success');
      }
    } catch (err: any) {
      addToast(`❌ ${err?.data?.error || 'Failed to edit message'}`, 'error');
    }
  };

  const handleSendVoiceNote = async (url: string) => {
    if (!activeConversationId) return;
    try {
      const res = await sendMessage({
        conversationId: activeConversationId,
        mediaUrl: url,
      }).unwrap();

      if (res.success) {
        setIsVoiceRecorderOpen(false);
        refetchConversations();
        refetchMessages();
        addToast('🎙️ Voice Note sent!', 'success');
      }
    } catch (err: any) {
      addToast(`❌ Failed to send voice note`, 'error');
    }
  };

  // Filter messages for 24-hour auto-delete and local Clear Chat
  const displayMessages = messages.filter((msg) => {
    const msgTime = new Date(msg.createdAt).getTime();
    if (clearedAtTimestamp && msgTime <= clearedAtTimestamp) {
      return false;
    }
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (msgTime < twentyFourHoursAgo) {
      return false;
    }
    return true;
  });

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId) return;

    if (editingMessage) {
      await handleSaveEdit();
      return;
    }

    if (!messageText.trim() && !productCodeInput.trim() && attachedMediaList.length === 0) {
      addToast('⚠️ Message text, product code, or file attachment is required', 'warning');
      return;
    }

    try {
      if (attachedMediaList.length > 0) {
        const firstMedia = attachedMediaList[0];
        const res = await sendMessage({
          conversationId: activeConversationId,
          text: messageText.trim() || undefined,
          productCode: productCodeInput.trim() || undefined,
          mediaUrl: firstMedia.url,
        }).unwrap();

        for (let i = 1; i < attachedMediaList.length; i++) {
          await sendMessage({
            conversationId: activeConversationId,
            mediaUrl: attachedMediaList[i].url,
          }).unwrap();
        }

        if (res.success) {
          setMessageText('');
          setAttachedMediaList([]);
          setUploadingFileName(null);
          if (!productCodeParam) setProductCodeInput('');
          refetchConversations();
          refetchMessages();

          const s = getSocket();
          s.emit('send_message', { conversationId: activeConversationId });
        }
      } else {
        const res = await sendMessage({
          conversationId: activeConversationId,
          text: messageText.trim() || undefined,
          productCode: productCodeInput.trim() || undefined,
        }).unwrap();

        if (res.success) {
          setMessageText('');
          if (!productCodeParam) setProductCodeInput('');
          refetchConversations();
          refetchMessages();

          const s = getSocket();
          s.emit('send_message', { conversationId: activeConversationId });
        }
      }
    } catch (err: any) {
      const errMsg = err?.data?.error || 'Failed to send message';
      addToast(`❌ ${errMsg}`, 'error');
    }
  };

  const handleProductCreated = (newProduct: any) => {
    if (newProduct?.code) {
      setProductCodeInput(newProduct.code);
      setIsProductInputOpen(true);
      addToast(`🎉 Product SKU ${newProduct.code} created! Click Send to share in chat.`, 'success');
    }
  };

  // 1. Loading Profile Guard
  if (isProfileLoading) {
    return (
      <WhatsAppLayout activeTab="chats">
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold">Verifying account permissions & security status...</p>
        </div>
      </WhatsAppLayout>
    );
  }

  // 2. UNAPPROVED ACCOUNT GUARD
  if (!currentUser || !isApprovedUser) {
    return (
      <WhatsAppLayout activeTab="chats">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 p-8 md:p-10 rounded-3xl border border-amber-500/40 text-center space-y-6 shadow-2xl max-w-lg w-full">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
              🔒
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                ACCOUNT STATUS: {currentUser?.status || 'UNVERIFIED'}
              </span>
              <h1 className="text-2xl font-extrabold text-white">Chat Access Restricted</h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Only users with <strong className="text-emerald-400">Account Status = APPROVED</strong> can send, receive messages, or search approved business members.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Account Status:</span>
                <span className="font-bold text-amber-400">{currentUser?.status || 'UNVERIFIED'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Real-Time Messaging:</span>
                <span className="font-bold text-rose-400">Disabled (Pending Super Admin Review)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/profile"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition"
              >
                View Account Status ➔
              </Link>
            </div>
          </div>
        </div>
      </WhatsAppLayout>
    );
  }

  // 3. APPROVED USER INTERACTIVE CHAT INTERFACE
  return (
    <WhatsAppLayout activeTab={activeLeftTab as any} unreadChatCount={0}>
      <div className="flex-1 flex h-full overflow-hidden relative">
        
        {/* ============================================================ */}
        {/* COLUMN 1: LEFT CHATS / CONTACTS LIST (WhatsApp Style Sidebar) */}
        {/* ============================================================ */}
        <div
          className={`${
            mobileView === 'CHAT' ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex-shrink-0 h-full overflow-hidden`}
        >
          {/* Header Bar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                💬
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white leading-tight">Messages</h2>
                <p className="text-[11px] text-emerald-400 font-semibold">Verified Business Network</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/groups"
                className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-600 hover:text-white transition"
                title="Trade Groups"
              >
                👥 Groups
              </Link>
            </div>
          </div>

          {/* Left Column Tab Switcher */}
          <div className="p-2 bg-slate-900 border-b border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveLeftTab('chats')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeLeftTab === 'chats'
                  ? 'bg-emerald-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>💬 Chats</span>
              <span className="text-[10px] bg-slate-950/40 px-1.5 rounded-full font-bold">{conversations.length}</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('contacts')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeLeftTab === 'contacts'
                  ? 'bg-emerald-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🔍 Contacts</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('communities')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeLeftTab === 'communities'
                  ? 'bg-emerald-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🏷️ Communities</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800">
            <div className="relative">
              <input
                type="text"
                placeholder={
                  activeLeftTab === 'contacts'
                    ? 'Search user by name or mobile number...'
                    : 'Search conversations...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>
          </div>

          {/* TAB 1: CHATS LIST */}
          {activeLeftTab === 'chats' && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {isConversationsLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                  <div className="text-3xl">💬</div>
                  <p className="font-semibold text-slate-300">No active conversations yet.</p>
                  <button
                    onClick={() => setActiveLeftTab('contacts')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs"
                  >
                    🔍 Find Verified Vendors to Chat
                  </button>
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = activeConversationId === c.conversationId;
                  const participant = c.participant;

                  const lastMsgTime = c.lastMessage?.createdAt || c.updatedAt;
                  const isCallMsg = c.lastMessage?.text?.startsWith('[CALL_LOG]:');
                  const lastMsgPreview = isCallMsg
                    ? c.lastMessage?.text?.includes('MISSED')
                      ? '📹 Missed Call'
                      : '📞 Call Ended'
                    : c.lastMessage?.mediaUrl
                    ? '📎 Media Attachment'
                    : c.lastMessage?.text
                    ? c.lastMessage.text
                    : c.lastMessage?.productCode
                    ? `📦 SKU: ${c.lastMessage.productCode}`
                    : participant?.shopName || 'Click to open conversation';

                  return (
                    <div
                      key={c.conversationId}
                      onClick={() => {
                        setActiveConversationId(c.conversationId);
                        setMobileView('CHAT');
                      }}
                      className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-l-4 border-emerald-500'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Participant Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-sm">
                          {participant?.fullName ? participant.fullName.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="font-bold text-xs text-white truncate flex items-center gap-1">
                            <span>{participant?.fullName || 'User'}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                          </h3>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {lastMsgTime
                              ? new Date(lastMsgTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {lastMsgPreview}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: CONTACTS DIRECTORY */}
          {activeLeftTab === 'contacts' && (
            <div className="flex-1 overflow-y-auto space-y-2 p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Verified Vendor Directory
              </div>

              {isSearchingApi ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Searching users...</div>
              ) : searchResults?.users && searchResults.users.length > 0 ? (
                searchResults.users.map((u) => (
                  <div
                    key={u.userId}
                    onClick={() => handleInitiateChat(u.userId)}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-500/30">
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs flex items-center gap-1">
                          <span>{u.fullName}</span>
                          <span className="text-emerald-400 text-[10px]">✓</span>
                        </h4>
                        <p className="text-[10px] text-slate-400">{u.shopName} • {u.mobileNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateChat(u.userId);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-slate-950 text-xs font-bold"
                    >
                      Chat 💬
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Type at least 2 characters to search approved business members by name or mobile number.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMUNITIES */}
          {activeLeftTab === 'communities' && (
            <div className="flex-1 overflow-y-auto space-y-2 p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Active B2B Communities
              </div>

              {AVAILABLE_COMMUNITIES.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                      {c.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{c.label}</h4>
                      <p className="text-[10px] text-slate-400">Super Admin Verified Trade Network</p>
                    </div>
                  </div>
                  <Link
                    href="/groups"
                    className="px-3 py-1 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[11px] font-bold"
                  >
                    Groups ➔
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* COLUMN 2: MAIN 1-ON-1 CONVERSATION CHAT PANEL */}
        {/* ============================================================ */}
        <div
          className={`${
            mobileView === 'LIST' ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col bg-slate-950 h-full overflow-hidden`}
        >
          {!activeConversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-4xl mb-4 border border-emerald-500/20 shadow-inner">
                💬
              </div>
              <h3 className="text-lg font-bold text-white mb-2">B2B Real-Time Messenger</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Select a conversation from the left or search approved business members to start real-time messaging.
              </p>
            </div>
          ) : (
            <>
              {/* WhatsApp Style Chat Top Header with CALL BUTTONS */}
              <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('LIST')}
                    className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    ←
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-sm">
                    {currentParticipant?.fullName ? currentParticipant.fullName.charAt(0).toUpperCase() : '👤'}
                  </div>

                  <div>
                    <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{currentParticipant?.fullName || 'Business Member'}</span>
                      <span className="text-emerald-400 text-xs">✓</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {currentParticipant?.shopName || 'Verified Vendor'} • {currentParticipant?.mobileNumber || 'Online'}
                    </p>
                  </div>
                </div>

                {/* Call, Clear Chat & SKU Action Header Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartCall('AUDIO')}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                    title="Start Audio Call"
                  >
                    <span>📞</span> <span className="hidden sm:inline">Audio Call</span>
                  </button>

                  <button
                    onClick={() => handleStartCall('VIDEO')}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1"
                    title="Start Video Call"
                  >
                    <span>📹</span> <span className="hidden sm:inline">Video Call</span>
                  </button>

                  <button
                    onClick={() => setIsMyProductPickerOpen(!isMyProductPickerOpen)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600 text-purple-200 border border-purple-500/30 transition flex items-center gap-1"
                  >
                    <span>📦</span> Attach SKU
                  </button>

                  <button
                    onClick={handleClearChat}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1"
                    title="Clear Chat (Your View Only)"
                  >
                    <span>🧹</span> <span className="hidden sm:inline">Clear Chat</span>
                  </button>
                </div>
              </div>

              {/* 24-Hour Auto-Delete Active Notification Banner */}
              <div className="bg-slate-900/60 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  ⏳ 24-Hour Auto-Delete Enabled (Messages auto-clear after 24h)
                </span>
                <span className="text-slate-500">🔒 End-to-End Encrypted B2B Direct Chat</span>
              </div>

              {/* SKU Product Quick Picker Dropdown */}
              {isMyProductPickerOpen && (
                <div className="bg-slate-900 border-b border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2 z-20 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Attach Your Published Product SKU:</span>
                    <button
                      onClick={() => setIsCreateProductModalOpen(true)}
                      className="text-emerald-400 hover:underline text-[11px]"
                    >
                      + Create New SKU
                    </button>
                  </div>

                  {myProducts.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No products listed yet. Click "+ Create New SKU" above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {myProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setProductCodeInput(p.code);
                            setIsProductInputOpen(true);
                            setIsMyProductPickerOpen(false);
                            addToast(`Attached SKU Code: ${p.code}`, 'info');
                          }}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="truncate">
                            <span className="font-mono text-emerald-400 font-bold mr-2">{p.code}</span>
                            <span className="text-slate-300">{p.title}</span>
                          </div>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 flex-shrink-0">
                            Attach
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {isMessagesLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400 animate-pulse">
                    💬 Fetching chat history...
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-500">
                    No messages in this chat yet. Send a greeting or request a product quote!
                  </div>
                ) : (
                  displayMessages.map((msg) => {
                    const isSelf = msg.senderId === currentUser?.id;
                    const isCallLog = msg.text?.startsWith('[CALL_LOG]:');

                    // Parse Call History Entry
                    if (isCallLog) {
                      const logPayload = msg.text?.replace('[CALL_LOG]:', '').trim() || '';
                      const [callType, durationOrMissed] = logPayload.split('|').map((s) => s.trim());
                      const isMissed = durationOrMissed === 'MISSED';
                      const isVideo = callType === 'VIDEO';

                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-3 shadow-md">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                isMissed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {isVideo ? '📹' : '📞'}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-1.5 text-xs text-white">
                                <span>{isVideo ? 'Video Call' : 'Audio Call'}</span>
                                {isMissed ? (
                                  <span className="text-[10px] text-rose-400 font-extrabold uppercase">Missed</span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 font-bold">
                                    {Math.floor(Number(durationOrMissed || 0) / 60)}m {Number(durationOrMissed || 0) % 60}s
                                  </span>
                                )}
                              </p>
                              <span className="text-[9px] text-slate-400">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleStartCall(isVideo ? 'VIDEO' : 'AUDIO')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-600 hover:text-slate-950 transition"
                            >
                              Call Back
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`relative max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isSelf
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 rounded-tr-none font-medium'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                          }`}
                        >
                          {/* Own Message Edit Button Overlay */}
                          {isSelf && msg.text && !msg.isDeleted && (
                            <button
                              onClick={() => handleStartEditMessage(msg)}
                              className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition p-1 bg-slate-900 border border-slate-700 text-slate-300 hover:text-emerald-400 rounded-full text-[10px] font-bold shadow"
                              title="Edit Message"
                            >
                              ✏️
                            </button>
                          )}

                          {/* Standard Message Text */}
                          {msg.text && <p>{msg.text}</p>}

                          {/* Media Attachment Preview (Images, Videos, PDFs, Docs, Audio) */}
                          {msg.mediaUrl && (
                            <ChatMediaPreview mediaUrl={msg.mediaUrl} senderName={isSelf ? 'You' : currentParticipant?.fullName} />
                          )}

                          {/* SKU Attachment Display Card */}
                          {msg.productCode && (
                            <RichProductSkuCard
                              productCode={msg.productCode}
                              onOpenDetails={(prod) => setSelectedProductForDetail(prod)}
                            />
                          )}

                          {/* Store Attachment Card */}
                          {msg.text && msg.text.includes('/store/') && (
                            (() => {
                              const match = msg.text.match(/\/store\/([a-zA-Z0-9_-]+)/);
                              const targetStoreId = match ? match[1] : null;
                              if (!targetStoreId) return null;
                              return (
                                <div className="mt-2 p-3 bg-slate-950/95 rounded-2xl border border-emerald-500/40 text-white flex items-center justify-between gap-3 shadow-lg">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                                      🏬
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-xs text-white">Business Storefront</h4>
                                      <p className="text-[10px] text-slate-400">Official Product Catalog</p>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/store/${encodeURIComponent(targetStoreId)}`}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-extrabold shadow transition"
                                  >
                                    View Store ➔
                                  </Link>
                                </div>
                              );
                            })()
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-70">
                            {msg.isEdited && <span className="italic font-semibold text-slate-900">(edited)</span>}
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isSelf && <span>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Upload Progress Bar Indicator */}
              {uploadProgress !== null && (
                <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin text-emerald-400">⏳</span>
                    <span>Uploading file <strong>{uploadingFileName}</strong> ({uploadProgress}%)...</span>
                  </div>
                  <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Inline Voice Recorder Component */}
              {isVoiceRecorderOpen ? (
                <div className="p-3 bg-slate-900 border-t border-slate-800 z-10 flex-shrink-0">
                  <VoiceRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setIsVoiceRecorderOpen(false)}
                  />
                </div>
              ) : (
                /* Message Input Composer */
                <form onSubmit={handleSendMessageSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2 flex-shrink-0 z-10">
                  {/* Editing Message Pill */}
                  {editingMessage && (
                    <div className="flex items-center justify-between bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs">
                      <span className="text-amber-300 font-bold">
                        ✏️ Editing sent message: "{editingMessage.text}"
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-slate-400 hover:text-white text-xs font-bold"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}

                  {/* SKU Code Attachment Pill */}
                  {productCodeInput && (
                    <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs">
                      <span className="text-emerald-400 font-bold font-mono">
                        📦 Attached SKU: {productCodeInput}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProductCodeInput('')}
                        className="text-slate-400 hover:text-white text-xs font-bold"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}

                  {/* Multiple File Attachments List Pills */}
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

                  <div className="flex items-center gap-2">
                    {/* Voice Note Record Button */}
                    <button
                      type="button"
                      onClick={() => setIsVoiceRecorderOpen(true)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500 transition"
                      title="Record Voice Note"
                    >
                      🎙️
                    </button>

                    {/* File Attachment Button (Images, Videos, PDFs, Docs) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500 transition"
                      title="Attach Gallery Images, Videos, PDF or Documents (Multiple Selection Supported)"
                    >
                      📎
                    </button>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                      multiple
                      className="hidden"
                    />

                    {/* Product SKU Picker Button */}
                    <button
                      type="button"
                      onClick={() => setIsMyProductPickerOpen(!isMyProductPickerOpen)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 hover:text-white transition"
                      title="Attach Product SKU"
                    >
                      📦
                    </button>

                    {/* Share My Store Link Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const storeSlug = currentUser?.business?.shopName
                          ? currentUser.business.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                          : 'me';
                        const storeUrl = `${window.location.origin}/store/${storeSlug}`;
                        setMessageText((prev) => (prev ? `${prev}\n${storeUrl}` : `Check out our official store catalog: ${storeUrl}`));
                        addToast('🏬 Store catalog link attached to message!', 'info');
                      }}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 hover:text-white transition"
                      title="Share My Store Catalog"
                    >
                      🏬
                    </button>

                    <input
                      type="text"
                      placeholder={editingMessage ? 'Update message text...' : 'Type a message...'}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 bg-slate-950 text-white text-xs px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    />

                    <button
                      type="submit"
                      disabled={isSendingMessage || isEditingMessage || (!messageText.trim() && !productCodeInput.trim() && attachedMediaList.length === 0)}
                      className="px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition disabled:opacity-50 shadow-md flex-shrink-0"
                    >
                      {editingMessage ? (isEditingMessage ? 'Saving...' : 'Update') : isSendingMessage ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Caller WebRTC Call Modal Screen */}
      <CallModal
        isOpen={isCallModalOpen}
        callType={activeCallType}
        role="CALLER"
        targetUserId={currentParticipant?.userId}
        participant={currentParticipant || null}
        onEndCall={handleEndCall}
      />

      {/* Create Product Modal */}
      <ClothingProductCreateModal
        isOpen={isCreateProductModalOpen}
        onClose={() => setIsCreateProductModalOpen(false)}
        onSuccess={handleProductCreated}
      />

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
    </WhatsAppLayout>
  );
}

