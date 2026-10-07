import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
  ScrollView,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { useGetMessagesQuery, useSendMessageMutation, useForwardMessageMutation, useToggleReactionMutation, useGetConversationsQuery, useMarkConversationAsReadMutation } from '../store/api/chatApi';
import { useGetMyStoreQuery, useGetStoreByIdQuery } from '../store/api/storeApi';
import { socketService } from '../services/socket/socketService';
import { useAppSelector } from '../hooks/useRedux';
import { colors, spacing, borderRadius } from '../theme/theme';
import { ENV_CONFIG } from '../constants/config';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, recipientId, recipientName } = route.params;
  const { user, token } = useAppSelector((state) => state.auth);

  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [messageText, setMessageText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSecs, setVoiceSecs] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [selectedMsgActions, setSelectedMsgActions] = useState<any | null>(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleScrollToQuotedMessage = (quoteContentSnippet: string) => {
    if (!quoteContentSnippet) return;
    const msgs = [...(messagesData?.messages || [])].reverse();
    const targetIdx = msgs.findIndex(
      (m) =>
        (m.text && m.text.toLowerCase().includes(quoteContentSnippet.toLowerCase())) ||
        quoteContentSnippet.toLowerCase().includes((m.text || '').toLowerCase())
    );
    if (targetIdx !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index: targetIdx, animated: true, viewPosition: 0.5 });
        const targetId = msgs[targetIdx].id;
        setHighlightedMsgId(targetId);
        setTimeout(() => setHighlightedMsgId(null), 2000);
      } catch (err) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  };

  const handlePickPhoto = async () => {
    setAttachmentModalVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        uploadAndSendMedia(result.assets[0], '📷 Photo Attachment');
      }
    } catch (e) {
      Alert.alert('Photo Error', 'Failed to pick photo.');
    }
  };

  const handlePickVideo = async () => {
    setAttachmentModalVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        uploadAndSendMedia(result.assets[0], '🎥 Video Attachment');
      }
    } catch (e) {
      Alert.alert('Video Error', 'Failed to pick video.');
    }
  };

  const uploadAndSendMedia = async (asset: any, defaultCaption: string) => {
    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      } as any);

      const uploadRes = await fetch(`${ENV_CONFIG.API_BASE_URL}/upload/single`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const rawText = await uploadRes.text();
      let uploadData: any = {};
      try {
        uploadData = JSON.parse(rawText);
      } catch (e) {
        console.warn('Upload response non-JSON text:', rawText);
      }
      const mediaUrl = uploadData.url || uploadData.file?.url || asset.uri;
      setUploadingMedia(false);
      await handleSendText(defaultCaption, undefined, mediaUrl);
    } catch (err) {
      setUploadingMedia(false);
      await handleSendText(defaultCaption, undefined, asset.uri);
    }
  };

  const handleStartVoiceRecording = () => {
    setAttachmentModalVisible(false);
    setIsRecordingVoice(true);
    setVoiceSecs(0);
    timerRef.current = setInterval(() => {
      setVoiceSecs((prev) => prev + 1);
    }, 1000);
  };

  const handleCancelVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    setVoiceSecs(0);
  };

  const handleSendVoiceNote = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = voiceSecs;
    setIsRecordingVoice(false);
    setVoiceSecs(0);

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durLabel = `${mins}:${secs.toString().padStart(2, '0')}`;
    const dummyAudioUrl = 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg';
    await handleSendText(`🎙️ Voice Note (${durLabel})`, undefined, dummyAudioUrl);
  };
  const [quickCatalogVisible, setQuickCatalogVisible] = useState(false);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: messagesData, refetch } = useGetMessagesQuery(
    { conversationId: activeConvId || '' },
    { skip: !activeConvId }
  );

  const { data: conversationsData } = useGetConversationsQuery();

  const { data: myStoreData } = useGetMyStoreQuery();
  const { data: participantData, isLoading: loadingParticipant } = useGetStoreByIdQuery(recipientId, {
    skip: !recipientId,
  });

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [forwardMessageMutation, { isLoading: isForwardingMsg }] = useForwardMessageMutation();
  const [toggleReaction] = useToggleReactionMutation();
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<string[]>([]);

  const [markAsReadMutation] = useMarkConversationAsReadMutation();

  useEffect(() => {
    if (activeConvId) {
      markAsReadMutation(activeConvId).catch(() => {});
    }
  }, [activeConvId]);

  useEffect(() => {
    socketService.connect();
    socketService.on('message:new', (msg) => {
      if (msg.conversationId === activeConvId || msg.senderId === recipientId) {
        refetch();
      }
    });
    socketService.on('receive_message', (msg) => {
      if (msg.conversationId === activeConvId || msg.senderId === recipientId) {
        refetch();
      }
    });
    socketService.on('message_status_update', (data: any) => {
      if (data?.conversationId === activeConvId) {
        refetch();
      }
    });
    if (activeConvId) {
      socketService.emit('mark_read', { conversationId: activeConvId });
    }

    return () => {
      socketService.off('message:new');
      socketService.off('receive_message');
      socketService.off('message_status_update');
    };
  }, [activeConvId, recipientId]);

  const handleSendText = async (customText?: string, customProductCode?: string, customMediaUrl?: string) => {
    let textToSend = customText ?? messageText.trim();
    if (!textToSend && !customProductCode && !customMediaUrl) return;

    const currentReplyId = replyingToMessage?.id;
    if (replyingToMessage) {
      setReplyingToMessage(null);
    }

    try {
      const res = await sendMessage({
        conversationId: activeConvId,
        recipientId,
        text: textToSend || undefined,
        productCode: customProductCode,
        mediaUrl: customMediaUrl,
        replyToId: currentReplyId,
        clientMessageId: `msg-${Date.now()}`,
      }).unwrap();

      const newConvId = (res as any)?.conversationId || (res as any)?.message?.conversationId;
      if (newConvId && !activeConvId) {
        setActiveConvId(newConvId);
      }

      if (!customText && !customProductCode) setMessageText('');
      refetch();
    } catch (err: any) {
      Alert.alert('Send Failed', err?.data?.error || err?.message || 'Unable to send message.');
    }
  };

  const handleForwardSubmit = async () => {
    if (!forwardingMessage || selectedForwardTargets.length === 0) return;
    const isManyTimes = (forwardingMessage.forwardCount || 0) >= 5 || forwardingMessage.isForwardedManyTimes;
    if (isManyTimes && selectedForwardTargets.length > 1) {
      Alert.alert('Forward Limit', 'Messages forwarded 5 or more times can only be forwarded to 1 chat at a time.');
      return;
    }
    if (!isManyTimes && selectedForwardTargets.length > 5) {
      Alert.alert('Forward Limit', 'You can only select up to 5 chats at a time.');
      return;
    }

    try {
      await forwardMessageMutation({
        messageId: forwardingMessage.id,
        targetConversationIds: selectedForwardTargets,
      }).unwrap();

      setForwardModalVisible(false);
      setForwardingMessage(null);
      setSelectedForwardTargets([]);
      Alert.alert('Message Forwarded', `Message forwarded to ${selectedForwardTargets.length} chat(s)!`);
      refetch();
    } catch (err: any) {
      Alert.alert('Forward Failed', err?.data?.error || err?.message || 'Unable to forward message.');
    }
  };

  const handleForwardMessageToRecipient = async (targetUserId: string, targetName: string) => {
    if (!forwardingMessage) return;
    try {
      await forwardMessageMutation({
        messageId: forwardingMessage.id,
        targetConversationIds: targetUserId ? [targetUserId] : [],
      }).unwrap();
      setForwardModalVisible(false);
      setForwardingMessage(null);
      Alert.alert('Message Forwarded', `Message forwarded to ${targetName}.`);
      refetch();
    } catch (err: any) {
      Alert.alert('Forward Failed', err?.data?.error || err?.message || 'Unable to forward message.');
    }
  };

  const handlePickAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingMedia(true);
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `attachment_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);

        const uploadRes = await fetch(`${ENV_CONFIG.API_BASE_URL}/upload/single`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        const mediaUrl = uploadData.url || uploadData.file?.url || asset.uri;
        setUploadingMedia(false);
        await handleSendText('📷 Media Attachment', undefined, mediaUrl);
      }
    } catch (err: any) {
      setUploadingMedia(false);
      Alert.alert('Upload Error', 'Failed to upload attachment.');
    }
  };

  const handleShareProductCard = (productCode: string, title: string) => {
    setQuickCatalogVisible(false);
    handleSendText(`📦 Shared Product Catalog Item: ${title}`, productCode);
  };

  const handleCallParticipant = (callType: 'AUDIO' | 'VIDEO' = 'AUDIO') => {
    navigation.navigate('Call', {
      recipientId,
      recipientName,
      recipientAvatar: route.params.recipientAvatar || participantBusiness?.logoUrl,
      callType,
      isIncoming: false,
    });
  };

  const handleOpenStore = () => {
    setParticipantModalVisible(false);
    setSelectedProductModal(null);
    const bizId = participantBusiness?.id || recipientId;
    navigation.navigate('Main', {
      screen: 'Store',
      params: { businessId: bizId },
    });
  };

  const myProducts = myStoreData?.store?.products || [];
  const participantStore = (participantData as any)?.store;
  const participantBusiness = (participantData as any)?.business;
  const participantProducts = (participantData as any)?.products || participantStore?.products || [];

  return (
    <View style={styles.container}>
      {/* WhatsApp Contextual Selection Top Header Bar */}
      {selectedMsgActions ? (
        <View style={styles.selectedHeaderBar}>
          <TouchableOpacity
            style={styles.selectedHeaderLeftRow}
            onPress={() => setSelectedMsgActions(null)}
          >
            <Text style={styles.selectedHeaderBackText}>←</Text>
            <Text style={styles.selectedHeaderCountText}>1 Selected</Text>
          </TouchableOpacity>

          <View style={styles.selectedHeaderActionsRow}>
            <TouchableOpacity
              style={styles.selectedHeaderActionBtn}
              onPress={() => {
                setReplyingToMessage(selectedMsgActions);
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.selectedHeaderActionIcon}>↩️ Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectedHeaderActionBtn}
              onPress={() => {
                setForwardingMessage(selectedMsgActions);
                setForwardModalVisible(true);
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.selectedHeaderActionIcon}>↪️ Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectedHeaderActionBtn}
              onPress={() => {
                toggleReaction({ messageId: selectedMsgActions.id, emoji: '❤️' });
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.selectedHeaderActionIcon}>❤️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectedHeaderActionBtn}
              onPress={() => setSelectedMsgActions(null)}
            >
              <Text style={styles.selectedHeaderActionIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Header
          title={recipientName || participantBusiness?.shopName || 'Direct Chat'}
          subtitle="Tap for Profile & Catalog • Online"
          showBack
          onBack={() => navigation.goBack()}
          onTitlePress={() => setParticipantModalVisible(true)}
          rightElement={
            <View style={styles.headerRightRow}>
              <TouchableOpacity
                style={styles.callHeaderBtn}
                onPress={() => handleCallParticipant('AUDIO')}
              >
                <Text style={styles.callHeaderBtnText}>📞 Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callHeaderBtn}
                onPress={() => handleCallParticipant('VIDEO')}
              >
                <Text style={styles.callHeaderBtnText}>📹 Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileHeaderBtn}
                onPress={() => setParticipantModalVisible(true)}
              >
                <Text style={styles.profileHeaderBtnText}>👤 Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.catalogBtn}
                onPress={() => setQuickCatalogVisible(true)}
              >
                <Text style={styles.catalogBtnText}>$ Catalog</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={[...(messagesData?.messages || [])].reverse()}
          keyExtractor={(item) => item.id}
          inverted
          initialNumToRender={20}
          maxToRenderPerBatch={25}
          windowSize={10}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            const isForwarded = item.isForwarded || (item.forwardCount || 0) > 0 || item.text?.startsWith('↪️ Forwarded');
            const isForwardedManyTimes = (item.forwardCount || 0) >= 5 || (item as any).isForwardedManyTimes;
            const isSelected = selectedMsgActions?.id === item.id;

            const replyObj = item.replyToMessage;
            let quoteSender = replyObj?.senderName || (replyObj?.senderId === user?.id ? 'You' : recipientName);
            let quoteContent = replyObj?.text || replyObj?.productCode || (replyObj?.mediaUrl ? '📷 Attachment' : '');
            let mainMessageText = item.text || '';

            if (!quoteSender && item.text?.includes('↩️ Replying to')) {
              const lines = item.text.split('\n');
              quoteSender = lines[0]?.replace('↩️ Replying to', '').replace(':', '').trim() || 'Message';
              quoteContent = lines[1]?.replace(/^"/, '').replace(/"$/, '').trim() || '';
              mainMessageText = lines.slice(3).join('\n') || lines.slice(2).join('\n') || mainMessageText;
            } else if (isForwarded) {
              mainMessageText = item.text?.replace('↪️ Forwarded\n', '').replace('↪️ Forwarded', '') || mainMessageText;
            }

            const isHighlighted = highlightedMsgId === item.id;

            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.otherWrapper]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedMsgActions(isSelected ? null : item)}
                  onLongPress={() => setSelectedMsgActions(item)}
                  style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                    isSelected && styles.selectedBubbleHighlight,
                    isHighlighted && styles.flashHighlightBubble,
                  ]}
                >
                  {/* Forwarded Header Badge */}
                  {isForwardedManyTimes ? (
                    <View style={[styles.forwardedHeaderTag, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                      <Text style={[styles.forwardedHeaderText, { color: '#fbbf24' }]}>⏩ Forwarded Many Times</Text>
                    </View>
                  ) : isForwarded ? (
                    <View style={styles.forwardedHeaderTag}>
                      <Text style={styles.forwardedHeaderText}>↪️ Forwarded</Text>
                    </View>
                  ) : null}

                  {/* Quoted Reply Box Inside Bubble (Tapping it scrolls to original message!) */}
                  {Boolean(quoteSender) && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleScrollToQuotedMessage(quoteContent)}
                      style={styles.quotedInsideBox}
                    >
                      <View style={styles.quotedInsideAccentBar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quotedInsideSender}>{quoteSender}</Text>
                        <Text style={styles.quotedInsideText} numberOfLines={2}>
                          {quoteContent}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {item.productCode && (
                    <View style={styles.productCardPreview}>
                      <Text style={styles.productCardSku}>📦 SKU: {item.productCode}</Text>
                      <Text style={styles.productCardNotice}>Quick In-Chat Catalog Item</Text>
                    </View>
                  )}

                  {/* Voice Note Bubble */}
                  {item.text?.includes('🎙️ Voice Note') || item.mediaUrl?.includes('.ogg') || item.mediaUrl?.includes('.mp3') ? (
                    <View style={styles.voiceNoteBubbleCard}>
                      <TouchableOpacity
                        style={styles.voicePlayBtn}
                        onPress={() => setPlayingAudioId(playingAudioId === item.id ? null : item.id)}
                      >
                        <Text style={styles.voicePlayIcon}>{playingAudioId === item.id ? '⏸️' : '▶️'}</Text>
                      </TouchableOpacity>
                      <View style={styles.voiceWaveformBox}>
                        <Text style={styles.voiceWaveformLine}>
                          {playingAudioId === item.id ? '❚❙❘❙❚❙❚❙❘❙❚❙❘❙❚❙❚' : '||||||||||||||||||||'}
                        </Text>
                        <Text style={styles.voiceMetaSub}>🎙️ Voice Note • 0:15</Text>
                      </View>
                    </View>
                  ) : item.text?.includes('🎥 Video') || item.mediaUrl?.includes('.mp4') ? (
                    /* Video Attachment Card */
                    <TouchableOpacity
                      style={styles.videoCardContainer}
                      onPress={() => setPreviewMediaUrl(item.mediaUrl || 'https://via.placeholder.com/600x400.png?text=Video+Player')}
                    >
                      {item.mediaUrl ? (
                        <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.playBadgeIcon}>▶️</Text>
                        </View>
                      )}
                      <View style={styles.videoOverlayTag}>
                        <Text style={styles.videoOverlayText}>🎥 Video Attachment</Text>
                      </View>
                    </TouchableOpacity>
                  ) : item.mediaUrl ? (
                    /* Photo Attachment */
                    <TouchableOpacity onPress={() => setPreviewMediaUrl(item.mediaUrl)}>
                      <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
                    </TouchableOpacity>
                  ) : null}

                  {Boolean(mainMessageText) && !item.text?.includes('🎙️ Voice Note') && (
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                      {mainMessageText}
                    </Text>
                  )}

                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                      <Text style={[styles.statusTick, item.status === 'READ' && { color: '#0284c7', fontWeight: 'bold' }]}>
                        {item.status === 'PENDING'
                          ? '🕒'
                          : item.status === 'SENT'
                          ? '✓'
                          : item.status === 'DELIVERED'
                          ? '✓✓'
                          : item.status === 'READ'
                          ? '✓✓'
                          : '✓✓'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Outer Media Quick Forward Arrow Button (➦) */}
                {(item.mediaUrl || item.productCode) && (
                  <TouchableOpacity
                    style={styles.mediaOuterForwardBtn}
                    onPress={() => {
                      setForwardingMessage(item);
                      setForwardModalVisible(true);
                    }}
                  >
                    <Text style={styles.mediaOuterForwardIcon}>➦</Text>
                  </TouchableOpacity>
                )}

                {/* Instant 1-Tap WhatsApp Action Buttons next to bubble */}
                <View style={styles.sideQuickActionCol}>
                  <TouchableOpacity
                    style={styles.sideActionIconBtn}
                    onPress={() => setReplyingToMessage(item)}
                  >
                    <Text style={styles.sideActionIconText}>↩️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sideActionIconBtn}
                    onPress={() => {
                      setForwardingMessage(item);
                      setForwardModalVisible(true);
                    }}
                  >
                    <Text style={styles.sideActionIconText}>↪️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        {/* WhatsApp Quoted Reply Preview Banner */}
        {replyingToMessage && !isRecordingVoice && (
          <View style={styles.replyPreviewBanner}>
            <View style={styles.replyPreviewAccentBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyPreviewSender}>
                Replying to {replyingToMessage.senderId === user?.id ? 'You' : recipientName}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingToMessage.text || (replyingToMessage.mediaUrl ? '📷 Attachment' : '📦 Product SKU')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingToMessage(null)} style={styles.replyPreviewCloseBtn}>
              <Text style={styles.replyPreviewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar or Voice Recorder Bar */}
        {isRecordingVoice ? (
          <View style={styles.voiceRecordingBar}>
            <View style={styles.recordingTimerBox}>
              <Text style={styles.recordingDot}>🔴</Text>
              <Text style={styles.recordingTimerText}>
                Recording... 00:{voiceSecs.toString().padStart(2, '0')}
              </Text>
            </View>

            <TouchableOpacity style={styles.cancelVoiceBtn} onPress={handleCancelVoiceRecording}>
              <Text style={styles.cancelVoiceText}>🗑️ Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendVoiceBtn} onPress={handleSendVoiceNote}>
              <Text style={styles.sendVoiceText}>🚀 Send</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setAttachmentModalVisible(true)}>
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={replyingToMessage ? "Type your reply..." : "Message"}
              placeholderTextColor="#94a3b8"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />

            <TouchableOpacity style={styles.micBtn} onPress={handleStartVoiceRecording}>
              <Text style={styles.micIcon}>🎙️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendText()} disabled={isSending}>
              <Text style={styles.sendIcon}>➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* WhatsApp Attachment Sheet Modal (8 Grid Items + Drag Handle + Recent Media Strip) */}
      <Modal visible={attachmentModalVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setAttachmentModalVisible(false)}
        >
          <View style={styles.attachSheetContent}>
            {/* Top Sheet Drag Handle */}
            <View style={styles.sheetHandleBar} />

            <View style={styles.attachGrid8Box}>
              {/* Row 1 */}
              <View style={styles.attachGridRow}>
                <TouchableOpacity style={styles.attachGridCell} onPress={handlePickPhoto}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#0284c7' }]}>
                    <Text style={styles.attachIconSymbol}>🖼️</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={handlePickPhoto}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#ec4899' }]}>
                    <Text style={styles.attachIconSymbol}>📷</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={() => { setAttachmentModalVisible(false); Alert.alert('Location', 'Sharing current GPS business coordinates...'); }}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.attachIconSymbol}>📍</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Location</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={() => { setAttachmentModalVisible(false); setParticipantModalVisible(true); }}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#38bdf8' }]}>
                    <Text style={styles.attachIconSymbol}>👤</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Contact</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.attachGridRow}>
                <TouchableOpacity style={styles.attachGridCell} onPress={handlePickVideo}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#8b5cf6' }]}>
                    <Text style={styles.attachIconSymbol}>📄</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Document</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={() => { setAttachmentModalVisible(false); setQuickCatalogVisible(true); }}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#eab308' }]}>
                    <Text style={styles.attachIconSymbol}>📊</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Poll</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={() => { setAttachmentModalVisible(false); setQuickCatalogVisible(true); }}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#f43f5e' }]}>
                    <Text style={styles.attachIconSymbol}>📅</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>Event</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.attachGridCell} onPress={handlePickPhoto}>
                  <View style={[styles.attachIconCircle, { backgroundColor: '#06b6d4' }]}>
                    <Text style={styles.attachIconSymbol}>🪄</Text>
                  </View>
                  <Text style={styles.attachCellLabel}>AI images</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Strip: Recent Media Thumbnails */}
            <View style={styles.recentMediaStripSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentMediaRow}>
                {[
                  'https://via.placeholder.com/150/0284c7/ffffff?text=Gallery+1',
                  'https://via.placeholder.com/150/10b981/ffffff?text=Gallery+2',
                  'https://via.placeholder.com/150/ec4899/ffffff?text=Gallery+3',
                  'https://via.placeholder.com/150/8b5cf6/ffffff?text=Gallery+4',
                ].map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recentThumbBox}
                    onPress={() => {
                      setAttachmentModalVisible(false);
                      handleSendText('📷 Photo Attachment', undefined, url);
                    }}
                  >
                    <Image source={{ uri: url }} style={styles.recentThumbImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Media Lightbox Fullscreen Preview Modal */}
      <Modal visible={Boolean(previewMediaUrl)} animationType="fade" transparent>
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setPreviewMediaUrl(null)}>
            <Text style={styles.lightboxCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {previewMediaUrl && (
            <Image source={{ uri: previewMediaUrl }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Opposite Person / Business Profile Modal */}
      <Modal visible={participantModalVisible} animationType="slide" transparent>
        <View style={styles.fullModalBg}>
          <View style={styles.participantModalContainer}>
            {/* Modal Header Bar */}
            <View style={styles.partModalHeader}>
              <Text style={styles.partModalTitle}>Business Profile & Catalog</Text>
              <View style={styles.partHeaderActions}>
                <TouchableOpacity style={styles.openStoreHeaderBtn} onPress={handleOpenStore}>
                  <Text style={styles.openStoreHeaderText}>🏪 Open Store</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.partCloseBtn}
                  onPress={() => setParticipantModalVisible(false)}
                >
                  <Text style={styles.partCloseText}>✕ Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.partModalScroll} showsVerticalScrollIndicator={false}>
              {loadingParticipant ? (
                <View style={styles.loadingBox}>
                  <Text style={styles.loadingText}>Loading Partner Details...</Text>
                </View>
              ) : (
                <>
                  {/* Banner / Header Card */}
                  <View style={styles.profileHeroCard}>
                    {participantStore?.bannerUrl ? (
                      <Image source={{ uri: participantStore.bannerUrl }} style={styles.bannerImg} />
                    ) : (
                      <View style={styles.bannerPlaceholder} />
                    )}

                    <View style={styles.avatarRow}>
                      <View style={styles.avatarCircle}>
                        {participantStore?.logoUrl ? (
                          <Image source={{ uri: participantStore.logoUrl }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarInitials}>
                            {(participantBusiness?.shopName || recipientName || 'P').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View style={styles.heroTextCol}>
                        <View style={styles.titleRow}>
                          <Text style={styles.shopTitleText}>
                            {participantBusiness?.shopName || recipientName || 'Business Partner'}
                          </Text>
                          {participantBusiness?.verificationTag && (
                            <View style={styles.verifiedBadge}>
                              <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.ownerSubText}>
                          Owner: {participantBusiness?.ownerName || 'Verified Member'}
                        </Text>

                        {participantBusiness?.assignedRole && (
                          <View style={styles.roleTag}>
                            <Text style={styles.roleTagText}>{participantBusiness.assignedRole}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Quick Action CTA Bar: Call & Open Store */}
                  <View style={styles.ctaDoubleRow}>
                    <TouchableOpacity
                      style={styles.callCtaBtnFlex}
                      onPress={() => handleCallParticipant(participantBusiness?.mobileNumber)}
                    >
                      <Text style={styles.callCtaIcon}>📞</Text>
                      <Text style={styles.callCtaText}>
                        Call: {participantBusiness?.mobileNumber || 'Contact'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.storeCtaBtnFlex}
                      onPress={handleOpenStore}
                    >
                      <Text style={styles.callCtaIcon}>🏪</Text>
                      <Text style={styles.callCtaText}>Open Showroom</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Business & Trade Details Card */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.infoSectionTitle}>📋 Verification & Business Details</Text>
                    
                    <View style={styles.infoGridRow}>
                      <Text style={styles.infoLabel}>GST Number:</Text>
                      <Text style={styles.infoValue}>{participantBusiness?.gstNumber || 'GST Verified'}</Text>
                    </View>

                    <View style={styles.infoGridRow}>
                      <Text style={styles.infoLabel}>Location:</Text>
                      <Text style={styles.infoValue}>
                        {[
                          participantBusiness?.streetAddress,
                          participantBusiness?.city,
                          participantBusiness?.state,
                          participantBusiness?.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Registered Trade Hub'}
                      </Text>
                    </View>

                    {participantBusiness?.allowedCommunities && (
                      <View style={styles.infoGridRow}>
                        <Text style={styles.infoLabel}>Trade Communities:</Text>
                        <View style={styles.commsRow}>
                          {participantBusiness.allowedCommunities.map((c: string, idx: number) => (
                            <View key={idx} style={styles.commPill}>
                              <Text style={styles.commPillText}>{c.toUpperCase()}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {participantStore?.bio && (
                      <View style={styles.bioContainer}>
                        <Text style={styles.bioLabel}>About Business:</Text>
                        <Text style={styles.bioText}>{participantStore.bio}</Text>
                      </View>
                    )}
                  </View>

                  {/* Partner Catalog Showcase Section */}
                  <View style={styles.catalogSection}>
                    <View style={styles.catalogSecTitleRow}>
                      <Text style={styles.catalogSectionTitle}>
                        📦 Product Catalog ({participantProducts.length} items)
                      </Text>
                      <TouchableOpacity onPress={handleOpenStore}>
                        <Text style={styles.seeAllStoreLink}>View All in Store ➔</Text>
                      </TouchableOpacity>
                    </View>

                    {participantProducts.length === 0 ? (
                      <View style={styles.emptyCatBox}>
                        <Text style={styles.emptyCatText}>No active catalog items uploaded yet.</Text>
                      </View>
                    ) : (
                      participantProducts.map((prod: any) => (
                        <TouchableOpacity
                          key={prod.id}
                          style={styles.partCatalogCard}
                          activeOpacity={0.8}
                          onPress={() => setSelectedProductModal(prod)}
                        >
                          <View style={styles.partCatTopRow}>
                            {prod.images && prod.images[0] ? (
                              <Image source={{ uri: prod.images[0] }} style={styles.prodThumb} />
                            ) : (
                              <View style={styles.prodThumbPlaceholder}>
                                <Text style={styles.prodThumbIcon}>📦</Text>
                              </View>
                            )}

                            <View style={styles.prodDetailsCol}>
                              <Text style={styles.prodTitle}>{prod.title}</Text>
                              <Text style={styles.prodCode}>SKU: {prod.code}</Text>
                              
                              <View style={styles.prodPriceRow}>
                                <Text style={styles.prodPrice}>
                                  ₹{prod.priceTiers?.[0]?.price || prod.startingPrice || 'On Request'}
                                </Text>
                                {prod.moq && (
                                  <Text style={styles.prodMoq}>MOQ: {prod.moq} pcs</Text>
                                )}
                              </View>
                            </View>
                          </View>

                          <View style={styles.cardActionsRow}>
                            <TouchableOpacity
                              style={styles.viewDetailsBtn}
                              onPress={() => setSelectedProductModal(prod)}
                            >
                              <Text style={styles.viewDetailsText}>👁️ View Specs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.shareInChatBtnFlex}
                              onPress={() => {
                                setParticipantModalVisible(false);
                                handleSendText(`📦 Inquiry for SKU (${prod.code}): ${prod.title}`, prod.code);
                              }}
                            >
                              <Text style={styles.shareInChatText}>💬 Inquire SKU</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Detail Modal */}
      {selectedProductModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.productDetailModalBox}>
              <View style={styles.prodModalHeaderRow}>
                <Text style={styles.prodModalHeaderTitle} numberOfLines={1}>
                  {selectedProductModal.title}
                </Text>
                <TouchableOpacity onPress={() => setSelectedProductModal(null)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {selectedProductModal.images && selectedProductModal.images[0] ? (
                  <Image source={{ uri: selectedProductModal.images[0] }} style={styles.detailModalImage} />
                ) : (
                  <View style={styles.detailModalPlaceholder}>
                    <Text style={{ fontSize: 40 }}>📦</Text>
                  </View>
                )}

                <View style={styles.modalMetaRow}>
                  <Text style={styles.skuTagText}>SKU: {selectedProductModal.code}</Text>
                  <Text style={styles.modalPriceText}>
                    ₹{selectedProductModal.priceTiers?.[0]?.price || selectedProductModal.startingPrice || '100'} / unit
                  </Text>
                </View>

                <Text style={styles.modalMoqText}>
                  Minimum Order Quantity (MOQ): {selectedProductModal.moq || 10} units
                </Text>

                {/* Price Tiers if available */}
                {selectedProductModal.priceTiers && selectedProductModal.priceTiers.length > 0 && (
                  <View style={styles.priceTiersCard}>
                    <Text style={styles.priceTiersHeader}>Bulk Tier Rates</Text>
                    {selectedProductModal.priceTiers.map((tier: any, idx: number) => (
                      <View key={idx} style={styles.tierLine}>
                        <Text style={styles.tierQtyText}>Min Qty {tier.minQty}+ pcs</Text>
                        <Text style={styles.tierPriceText}>₹{tier.price} / pc</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.descLabel}>Product Specifications & Description:</Text>
                <Text style={styles.modalDescText}>
                  {selectedProductModal.description || 'Verified B2B wholesale trade product. High quality manufacturing.'}
                </Text>
              </ScrollView>

              <View style={styles.modalActionButtonsCol}>
                <TouchableOpacity
                  style={styles.primaryShareBtn}
                  onPress={() => {
                    const code = selectedProductModal.code;
                    const title = selectedProductModal.title;
                    setSelectedProductModal(null);
                    setParticipantModalVisible(false);
                    handleSendText(`📦 Inquiry for SKU (${code}): ${title}`, code);
                  }}
                >
                  <Text style={styles.primaryShareText}>💬 Share / Inquire SKU in Chat</Text>
                </TouchableOpacity>

                <View style={styles.modalDualActionsRow}>
                  <TouchableOpacity style={styles.viewPageBtn} onPress={() => {
                    const prodId = selectedProductModal.id;
                    setSelectedProductModal(null);
                    setParticipantModalVisible(false);
                    navigation.navigate('ProductDetail', { productId: prodId });
                  }}>
                    <Text style={styles.viewPageText}>📄 Full Page</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.openStoreBtn} onPress={handleOpenStore}>
                    <Text style={styles.openStoreText}>🏪 Open Vendor Store</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick $ SKU Catalog Selector Modal */}
      <Modal visible={quickCatalogVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>$ Select Product to Share</Text>
            <Text style={styles.modalSub}>
              Instantly share product cards without uploading duplicate 5MB files.
            </Text>

            <FlatList
              data={myProducts}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.catalogItem}
                  onPress={() => handleShareProductCard(item.code, item.title)}
                >
                  <Text style={styles.catItemTitle}>{item.title}</Text>
                  <Text style={styles.catItemSku}>SKU: {item.code} • ₹{item.priceTiers?.[0]?.price}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setQuickCatalogVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Message Action Sheet (Reply, Forward, React, Copy) */}
      <Modal visible={Boolean(selectedMsgActions)} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setSelectedMsgActions(null)}
        >
          <View style={styles.actionSheetContent}>
            <Text style={styles.actionSheetTitle}>Message Options</Text>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                setReplyingToMessage(selectedMsgActions);
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.actionSheetIcon}>↩️</Text>
              <Text style={styles.actionSheetLabel}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                setForwardingMessage(selectedMsgActions);
                setForwardModalVisible(true);
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.actionSheetIcon}>↪️</Text>
              <Text style={styles.actionSheetLabel}>Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                if (selectedMsgActions) {
                  toggleReaction({ messageId: selectedMsgActions.id, emoji: '❤️' });
                }
                setSelectedMsgActions(null);
              }}
            >
              <Text style={styles.actionSheetIcon}>❤️</Text>
              <Text style={styles.actionSheetLabel}>React with Heart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => setSelectedMsgActions(null)}
            >
              <Text style={styles.actionSheetIcon}>✕</Text>
              <Text style={styles.actionSheetCancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp Forward Selection Modal */}
      <Modal visible={forwardModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.partModalHeader}>
              <Text style={styles.modalTitle}>↪️ Forward Message</Text>
              <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                <Text style={styles.partCloseText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select a conversation participant to forward this message to:
            </Text>

            <FlatList
              data={conversationsData?.conversations || []}
              keyExtractor={(item, idx) => item.conversationId || item.id || String(idx)}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const partnerName = item.participant?.fullName || item.participant?.shopName || item.otherUser?.fullName || 'Business User';
                const partnerId = item.participant?.userId || item.otherUser?.id || item.user2Id || '';
                return (
                  <TouchableOpacity
                    style={styles.forwardRowItem}
                    onPress={() => handleForwardMessageToRecipient(partnerId, partnerName)}
                  >
                    <View style={styles.forwardAvatarCircle}>
                      <Text style={styles.forwardAvatarInitials}>
                        {partnerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.forwardContactName}>{partnerName}</Text>
                      <Text style={styles.forwardContactSub}>{item.participant?.shopName || 'Trade Partner'}</Text>
                    </View>

                    <Text style={styles.forwardSendBadge}>Send ➔</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flexOne: { flex: 1 },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileHeaderBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  profileHeaderBtnText: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  catalogBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catalogBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  messagesList: { padding: 14 },
  bubbleWrapper: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
  myWrapper: { justifyContent: 'flex-end' },
  otherWrapper: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#ffffff' },
  otherMessageText: { color: '#f8fafc' },
  messageImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
  productCardPreview: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#818cf8',
  },
  productCardSku: { color: '#818cf8', fontSize: 12, fontWeight: '900' },
  productCardNotice: { color: '#cbd5e1', fontSize: 10, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  statusTick: { color: '#38bdf8', fontSize: 10, fontWeight: '900' },
  reactBtn: { padding: 4, marginLeft: 4 },
  reactIcon: { fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  attachBtn: { padding: 8 },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendIcon: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#818cf8', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  catalogItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  catItemTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  catItemSku: { color: '#38bdf8', fontSize: 11, marginTop: 2 },
  closeModalBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  closeModalText: { color: '#e11d48', fontSize: 14, fontWeight: '800' },

  /* Participant Full Profile Modal Styles */
  fullModalBg: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'flex-end',
  },
  participantModalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  partModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  partModalTitle: { color: '#38bdf8', fontSize: 16, fontWeight: '900' },
  partCloseBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1e293b', borderRadius: 12 },
  partCloseText: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  partModalScroll: { paddingHorizontal: 16 },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  profileHeroCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bannerImg: { width: '100%', height: 90 },
  bannerPlaceholder: { width: '100%', height: 90, backgroundColor: '#1e293b' },
  avatarRow: { flexDirection: 'row', padding: 14, marginTop: -30, alignItems: 'flex-end' },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4f46e5',
    borderWidth: 3,
    borderColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  heroTextCol: { marginLeft: 12, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  shopTitleText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  verifiedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedBadgeText: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  ownerSubText: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  roleTag: { backgroundColor: '#312e81', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  roleTagText: { color: '#a5b4fc', fontSize: 10, fontWeight: '900' },
  callCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
  },
  callCtaIcon: { fontSize: 18 },
  callCtaText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  infoSectionCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoSectionTitle: { color: '#38bdf8', fontSize: 14, fontWeight: '900', marginBottom: 12 },
  infoGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  infoValue: { color: '#f8fafc', fontSize: 12, fontWeight: '800', flex: 1, textAlign: 'right' },
  commsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flex: 1 },
  commPill: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commPillText: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  bioContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  bioLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  bioText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },
  catalogSection: { marginTop: 18, marginBottom: 20 },
  catalogSectionTitle: { color: '#818cf8', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  emptyCatBox: { padding: 20, backgroundColor: '#020617', borderRadius: 14, alignItems: 'center' },
  emptyCatText: { color: '#64748b', fontSize: 12 },
  partCatalogCard: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  partCatTopRow: { flexDirection: 'row', alignItems: 'center' },
  prodThumb: { width: 60, height: 60, borderRadius: 10 },
  prodThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodThumbIcon: { fontSize: 24 },
  prodDetailsCol: { marginLeft: 12, flex: 1 },
  prodTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  prodCode: { color: '#38bdf8', fontSize: 11, fontWeight: '800', marginTop: 2 },
  prodPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  prodPrice: { color: '#4ade80', fontSize: 13, fontWeight: '900' },
  prodMoq: { color: '#94a3b8', fontSize: 10 },
  shareInChatBtn: {
    marginTop: 10,
    backgroundColor: '#312e81',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareInChatText: { color: '#a5b4fc', fontSize: 12, fontWeight: '900' },

  partHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openStoreHeaderBtn: {
    backgroundColor: '#312e81',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  openStoreHeaderText: { color: '#a5b4fc', fontSize: 11, fontWeight: '900' },
  callHeaderBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  callHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },

  ctaDoubleRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  callCtaBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  storeCtaBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  catalogSecTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllStoreLink: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },
  cardActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewDetailsText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
  shareInChatBtnFlex: {
    flex: 1,
    backgroundColor: '#312e81',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },

  /* Product Details Modal Styles */
  productDetailModalBox: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  prodModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prodModalHeaderTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900', flex: 1 },
  closeBtnText: { color: '#94a3b8', fontSize: 18, fontWeight: '900', paddingHorizontal: 8 },
  detailModalImage: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
  detailModalPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  skuTagText: { color: '#38bdf8', fontSize: 12, fontWeight: '900' },
  modalPriceText: { color: '#4ade80', fontSize: 18, fontWeight: '900' },
  modalMoqText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  priceTiersCard: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  priceTiersHeader: { color: '#818cf8', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  tierLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tierQtyText: { color: '#94a3b8', fontSize: 11 },
  tierPriceText: { color: '#4ade80', fontSize: 11, fontWeight: '800' },
  descLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  modalDescText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  modalActionButtonsCol: { gap: 8, marginTop: 10 },
  primaryShareBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryShareText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  modalDualActionsRow: { flexDirection: 'row', gap: 8 },
  viewPageBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewPageText: { color: '#cbd5e1', fontSize: 12, fontWeight: '800' },
  openStoreBtn: {
    flex: 1,
    backgroundColor: '#312e81',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  openStoreText: { color: '#a5b4fc', fontSize: 12, fontWeight: '800' },

  /* WhatsApp Voice Note Card & Media Styles */
  voiceNoteBubbleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    minWidth: 200,
  },
  voicePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayIcon: { fontSize: 16 },
  voiceWaveformBox: { flex: 1 },
  voiceWaveformLine: { color: colors.primaryLight, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  voiceMetaSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },

  videoCardContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    width: 200,
    height: 120,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  playBadgeIcon: { fontSize: 32 },
  videoOverlayTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  videoOverlayText: { color: colors.textMain, fontSize: 10, fontWeight: '800' },

  micBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  micIcon: { fontSize: 20 },

  voiceRecordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recordingTimerBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recordingDot: { fontSize: 12 },
  recordingTimerText: { color: colors.error, fontSize: 13, fontWeight: '800' },
  cancelVoiceBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  cancelVoiceText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  sendVoiceBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  sendVoiceText: { color: colors.textMain, fontSize: 12, fontWeight: '900' },

  /* WhatsApp Attachment Sheet Styles */
  attachSheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  attachSheetTitle: { color: colors.textMain, fontSize: 16, fontWeight: '900', marginBottom: spacing.lg },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  attachGridItem: { alignItems: 'center', gap: spacing.xs },
  attachGridIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGridIcon: { fontSize: 24 },
  attachGridLabel: { color: colors.textLight, fontSize: 12, fontWeight: '700' },

  /* Lightbox Fullscreen Styles */
  lightboxBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    zIndex: 10,
  },
  lightboxCloseText: { color: colors.textMain, fontSize: 14, fontWeight: '800' },
  lightboxImage: { width: '100%', height: '80%' },

  // Forwarded & Quoted Inside Styles
  forwardedHeaderTag: { marginBottom: 2 },
  forwardedHeaderText: { color: '#94a3b8', fontSize: 10, fontStyle: 'italic', fontWeight: '600' },
  quotedInsideBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  quotedInsideAccentBar: { width: 0 },
  quotedInsideSender: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  quotedInsideText: { color: '#cbd5e1', fontSize: 11 },

  // Quoted Reply Preview Banner
  replyPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  replyPreviewAccentBar: { width: 0 },
  replyPreviewSender: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  replyPreviewText: { color: '#cbd5e1', fontSize: 11 },
  replyPreviewCloseBtn: { padding: 6 },
  replyPreviewCloseText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },

  // Action Sheet Modal
  actionSheetContent: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '90%',
    alignSelf: 'center',
  },
  actionSheetTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  actionSheetIcon: { fontSize: 18 },
  actionSheetLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  actionSheetCancelLabel: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

  // Forward Modal Items
  forwardRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  forwardAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardAvatarInitials: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  forwardContactName: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  forwardContactSub: { color: '#64748b', fontSize: 11 },
  forwardSendBadge: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },

  /* WhatsApp Selection Header Bar */
  selectedHeaderBar: {
    height: 56,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  selectedHeaderLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedHeaderBackText: { color: '#38bdf8', fontSize: 20, fontWeight: '800' },
  selectedHeaderCountText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  selectedHeaderActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedHeaderActionBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectedHeaderActionIcon: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },
  selectedBubbleHighlight: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38bdf8',
    borderWidth: 1,
  },

  /* Side Quick 1-Tap Action Icons */
  sideQuickActionCol: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  sideActionIconBtn: {
    padding: 4,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sideActionIconText: { fontSize: 12 },

  // Flashing highlight when original message is jumped to
  flashHighlightBubble: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
    borderWidth: 1.5,
  },

  // Outer Media Quick Forward Button (➦)
  mediaOuterForwardBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mediaOuterForwardIcon: { color: '#ffffff', fontSize: 14, fontWeight: '900' },

  // Sheet Drag Handle Bar
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // 8 Icon Grid Layout
  attachGrid8Box: { gap: 16, marginBottom: 16 },
  attachGridRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  attachGridCell: { alignItems: 'center', width: 72 },
  attachIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  attachIconSymbol: { fontSize: 22 },
  attachCellLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Recent Media Horizontal Strip
  recentMediaStripSection: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, marginTop: 4 },
  recentMediaRow: { gap: 8, paddingHorizontal: 4 },
  recentThumbBox: { width: 68, height: 68, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  recentThumbImg: { width: '100%', height: '100%' },
});

