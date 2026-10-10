import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useLazySearchUsersQuery, SearchedUserItem } from '../store/api/chatApi';

interface StartChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: { userId: string; fullName: string; shopName?: string; avatar?: string; mobileNumber: string }) => void;
}

export const StartChatModal: React.FC<StartChatModalProps> = ({
  visible,
  onClose,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerSearch, { data, isFetching, isError, error }] = useLazySearchUsersQuery();

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        triggerSearch(trimmed);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, triggerSearch]);

  const handleTextChange = (text: string) => {
    setSearchQuery(text);
  };

  const cleanNumber = searchQuery.replace(/\D/g, '');
  const isValid10Digit = cleanNumber.length === 10;

  const usersList = data?.users || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            {/* Top Bar / Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerIcon}>💬</Text>
                <View>
                  <Text style={styles.headerTitle}>Start New Chat</Text>
                  <Text style={styles.headerSubtitle}>Search by 10-digit mobile number or business name</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Phone Number / Contact Search Input */}
            <View style={styles.searchBoxContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter mobile number (e.g. 9876543210)..."
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={searchQuery}
                  onChangeText={handleTextChange}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Searching Indicator */}
            {isFetching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadingText}>Searching contacts & registered numbers...</Text>
              </View>
            )}

            {/* Search Results List */}
            <FlatList
              data={usersList}
              keyExtractor={(item) => item.userId}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                isValid10Digit && !usersList.some(u => u.mobileNumber === cleanNumber) ? (
                  <TouchableOpacity
                    style={styles.directNumberCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      onSelectUser({
                        userId: cleanNumber,
                        fullName: `User (${cleanNumber})`,
                        mobileNumber: cleanNumber,
                      });
                      onClose();
                    }}
                  >
                    <View style={styles.directIconBox}>
                      <Text style={styles.directIcon}>⚡</Text>
                    </View>
                    <View style={styles.directInfo}>
                      <Text style={styles.directTitle}>Start Direct Chat</Text>
                      <Text style={styles.directSubtitle}>Mobile: +91 {cleanNumber}</Text>
                    </View>
                    <View style={styles.chatActionBadge}>
                      <Text style={styles.chatActionBadgeText}>Chat Now 💬</Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                !isFetching ? (
                  <View style={styles.emptyContainer}>
                    {searchQuery.trim().length > 0 ? (
                      <>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No matching contacts found</Text>
                        <Text style={styles.emptySub}>
                          {isValid10Digit
                            ? `You can tap above to start a direct chat with +91 ${cleanNumber}`
                            : 'Try typing a complete 10-digit mobile number or full name.'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.emptyIcon}>📱</Text>
                        <Text style={styles.emptyTitle}>Search by Mobile Number</Text>
                        <Text style={styles.emptySub}>
                          Type any 10-digit phone number or vendor name to easily find suppliers and start messaging instantly.
                        </Text>
                      </>
                    )}
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const initialChar = (item.shopName || item.fullName || 'U').charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    style={styles.userCard}
                    activeOpacity={0.75}
                    onPress={() => {
                      onSelectUser({
                        userId: item.userId,
                        fullName: item.fullName,
                        shopName: item.shopName,
                        avatar: item.avatar,
                        mobileNumber: item.mobileNumber,
                      });
                      onClose();
                    }}
                  >
                    {/* User Avatar */}
                    {item.avatar && item.avatar.startsWith('http') ? (
                      <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.defaultAvatar}>
                        <Text style={styles.defaultAvatarText}>{initialChar}</Text>
                      </View>
                    )}

                    {/* Contact Details */}
                    <View style={styles.userInfo}>
                      <View style={styles.userHeaderRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {item.shopName || item.fullName}
                        </Text>
                        {item.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓ Verified</Text>
                          </View>
                        )}
                      </View>

                      {item.shopName ? (
                        <Text style={styles.ownerName} numberOfLines={1}>
                          Contact: {item.fullName}
                        </Text>
                      ) : null}

                      {/* Prominently Show Mobile Number */}
                      <View style={styles.phonePill}>
                        <Text style={styles.phonePillText}>📱 +91 {item.mobileNumber}</Text>
                      </View>
                    </View>

                    {/* Chat Action Button */}
                    <View style={styles.startChatBtn}>
                      <Text style={styles.startChatBtnText}>Chat 💬</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#1e1b4b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 26,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a5b4fc',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  searchBoxContainer: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#1e1b4b',
  },
  loadingText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  directNumberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  directIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  directIcon: {
    fontSize: 20,
  },
  directInfo: {
    flex: 1,
  },
  directTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  directSubtitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  chatActionBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chatActionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4338ca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  defaultAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  ownerName: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  phonePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  phonePillText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },
  startChatBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startChatBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
