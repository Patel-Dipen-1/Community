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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { useGetMessagesQuery, useSendMessageMutation, useToggleReactionMutation } from '../store/api/chatApi';
import { useGetMyStoreQuery } from '../store/api/storeApi';
import { socketService } from '../services/socket/socketService';
import { useAppSelector } from '../hooks/useRedux';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, recipientId, recipientName } = route.params;
  const { user } = useAppSelector((state) => state.auth);

  const [messageText, setMessageText] = useState('');
  const [quickCatalogVisible, setQuickCatalogVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messagesData, refetch } = useGetMessagesQuery(
    { conversationId },
    { skip: !conversationId }
  );

  const { data: myStoreData } = useGetMyStoreQuery();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [toggleReaction] = useToggleReactionMutation();

  useEffect(() => {
    socketService.connect();
    socketService.on('message:new', (msg) => {
      if (msg.conversationId === conversationId || msg.senderId === recipientId) {
        refetch();
      }
    });

    return () => {
      socketService.off('message:new');
    };
  }, [conversationId, recipientId]);

  const handleSendText = async (customText?: string, customProductCode?: string, customMediaUrl?: string) => {
    const textToSend = customText ?? messageText.trim();
    if (!textToSend && !customProductCode && !customMediaUrl) return;

    try {
      await sendMessage({
        conversationId,
        recipientId,
        text: textToSend || undefined,
        productCode: customProductCode,
        mediaUrl: customMediaUrl,
        clientMessageId: `msg-${Date.now()}`,
      }).unwrap();

      if (!customText && !customProductCode) setMessageText('');
      refetch();
    } catch (err: any) {
      Alert.alert('Send Failed', err?.data?.error || 'Unable to send message.');
    }
  };

  const handlePickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const selectedUri = result.assets[0].uri;
      handleSendText('📷 Sent Image Attachment', undefined, selectedUri);
    }
  };

  const handleShareProductCard = (productCode: string, title: string) => {
    setQuickCatalogVisible(false);
    handleSendText(`📦 Shared Product Catalog Item: ${title}`, productCode);
  };

  const myProducts = myStoreData?.store?.products || [];

  return (
    <View style={styles.container}>
      <Header
        title={recipientName || 'Direct Chat'}
        subtitle="Online • End-to-End Encryption"
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.catalogBtn}
            onPress={() => setQuickCatalogVisible(true)}
          >
            <Text style={styles.catalogBtnText}>$ Catalog</Text>
          </TouchableOpacity>
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
});
