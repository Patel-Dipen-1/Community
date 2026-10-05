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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { useGetMessagesQuery, useSendMessageMutation, useToggleReactionMutation } from '../store/api/chatApi';
import { useGetMyStoreQuery, useGetStoreByIdQuery } from '../store/api/storeApi';
import { socketService } from '../services/socket/socketService';
import { useAppSelector } from '../hooks/useRedux';

import { ENV_CONFIG } from '../constants/config';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, recipientId, recipientName } = route.params;
  const { user, token } = useAppSelector((state) => state.auth);

  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [messageText, setMessageText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [quickCatalogVisible, setQuickCatalogVisible] = useState(false);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: messagesData, refetch } = useGetMessagesQuery(
    { conversationId: activeConvId || '' },
    { skip: !activeConvId }
  );

  const { data: myStoreData } = useGetMyStoreQuery();
  const { data: participantData, isLoading: loadingParticipant } = useGetStoreByIdQuery(recipientId, {
    skip: !recipientId,
  });

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [toggleReaction] = useToggleReactionMutation();

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

    return () => {
      socketService.off('message:new');
      socketService.off('receive_message');
    };
  }, [activeConvId, recipientId]);

  const handleSendText = async (customText?: string, customProductCode?: string, customMediaUrl?: string) => {
    const textToSend = customText ?? messageText.trim();
    if (!textToSend && !customProductCode && !customMediaUrl) return;

    try {
      const res = await sendMessage({
        conversationId: activeConvId,
        recipientId,
        text: textToSend || undefined,
        productCode: customProductCode,
        mediaUrl: customMediaUrl,
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

  const handleCallParticipant = (phone?: string) => {
    if (!phone) {
      Alert.alert('Call Unavailable', 'No mobile number associated with this partner.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to launch phone dialer.');
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
      <Header
        title={recipientName || participantBusiness?.shopName || 'Direct Chat'}
        subtitle="Tap for Profile & Catalog • Online"
        showBack
        onBack={() => navigation.goBack()}
        onTitlePress={() => setParticipantModalVisible(true)}
        rightElement={
          <View style={styles.headerRightRow}>
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

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messagesData?.messages || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.otherWrapper]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                  {item.productCode && (
                    <View style={styles.productCardPreview}>
                      <Text style={styles.productCardSku}>📦 SKU: {item.productCode}</Text>
                      <Text style={styles.productCardNotice}>Quick In-Chat Catalog Item</Text>
                    </View>
                  )}

                  {item.mediaUrl && (
                    <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
                  )}

                  {Boolean(item.text) && (
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                      {item.text}
                    </Text>
                  )}

                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                      <Text style={styles.statusTick}>
                        {item.status === 'READ' ? '✓✓' : item.status === 'DELIVERED' ? '✓✓' : '✓'}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Emoji Reactions Bar */}
                <TouchableOpacity
                  style={styles.reactBtn}
                  onPress={() => toggleReaction({ messageId: item.id, emoji: '❤️' })}
                >
                  <Text style={styles.reactIcon}>👍</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachment}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message or tap $ for SKU catalog..."
            placeholderTextColor="#64748b"
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />

          <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendText()} disabled={isSending}>
            <Text style={styles.sendIcon}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
});
