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
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useCreateBroadcastListMutation } from '../store/api/broadcastApi';
import { useLazySearchUsersQuery, SearchedUserItem } from '../store/api/chatApi';

interface CreateBroadcastModalProps {
  visible: boolean;
  onClose: () => void;
  onListCreated?: () => void;
}

export const CreateBroadcastModal: React.FC<CreateBroadcastModalProps> = ({
  visible,
  onClose,
  onListCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SearchedUserItem[]>([]);

  const [createBroadcastList, { isLoading: isCreating }] = useCreateBroadcastListMutation();
  const [triggerSearch, { data: searchData, isFetching: isSearching }] = useLazySearchUsersQuery();

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setSearchQuery('');
      setSelectedUsers([]);
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

  const toggleSelectUser = (user: SearchedUserItem) => {
    if (selectedUsers.some((u) => u.userId === user.userId)) {
      setSelectedUsers(selectedUsers.filter((u) => u.userId !== user.userId));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateList = async () => {
    if (!title.trim()) {
      Alert.alert('List Title Required', 'Please enter a name for your broadcast list.');
      return;
    }

    try {
      const recipientIds = selectedUsers.map((u) => u.userId);

      await createBroadcastList({
        title: title.trim(),
        description: description.trim() || undefined,
        recipientIds,
      }).unwrap();

      Alert.alert(
        'Broadcast List Created! 🎉',
        `Broadcast list "${title}" has been created with ${recipientIds.length} contact(s).`
      );
      onClose();
      if (onListCreated) {
        onListCreated();
      }
    } catch (err: any) {
      Alert.alert(
        'Creation Failed',
        err?.data?.error || err?.message || 'Failed to create broadcast list. Please check recipient limit or try again.'
      );
    }
  };

  const searchResults = searchData?.users || [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            {/* Top Bar / Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerIcon}>📢</Text>
                <View>
                  <Text style={styles.headerTitle}>New Broadcast List</Text>
                  <Text style={styles.headerSubtitle}>
                    Selected: {selectedUsers.length} contact(s)
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Title & Description Box */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Broadcast List Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Surat Cotton Retailers List"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.label, { marginTop: 10 }]}>Description (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Wholesale price update list"
                placeholderTextColor="#64748b"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Recipient Search & Picker */}
            <View style={styles.searchBoxContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search phone number or contact name..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Selected Recipients Horizontal Pills */}
              {selectedUsers.length > 0 && (
                <FlatList
                  horizontal
                  data={selectedUsers}
                  keyExtractor={(u) => u.userId}
                  style={{ marginTop: 10 }}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.selectedPill}
                      onPress={() => toggleSelectUser(item)}
                    >
                      <Text style={styles.selectedPillText} numberOfLines={1}>
                        {item.shopName || item.fullName} ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadingText}>Searching contacts...</Text>
              </View>
            )}

            {/* Contacts List */}
            <FlatList
              data={searchResults}
              keyExtractor={(u) => u.userId}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                !isSearching ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📢</Text>
                    <Text style={styles.emptyTitle}>Select Recipients</Text>
                    <Text style={styles.emptySub}>
                      Recipients will receive individual 1-to-1 direct messages without seeing each other. Search mobile numbers to add contacts.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const isSelected = selectedUsers.some((u) => u.userId === item.userId);
                const initialChar = (item.shopName || item.fullName || 'U').charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    style={[styles.userCard, isSelected && styles.userCardSelected]}
                    activeOpacity={0.8}
                    onPress={() => toggleSelectUser(item)}
                  >
                    <View style={styles.defaultAvatar}>
                      <Text style={styles.defaultAvatarText}>{initialChar}</Text>
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.shopName || item.fullName}
                      </Text>
                      <Text style={styles.userPhone}>📱 +91 {item.mobileNumber}</Text>
                    </View>

                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      <Text style={styles.checkboxText}>{isSelected ? '✓' : '+'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Submit Action Footer */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.createBtn}
                activeOpacity={0.85}
                disabled={isCreating}
                onPress={handleCreateList}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.createBtnText}>
                    Create List {selectedUsers.length > 0 ? `(${selectedUsers.length} contacts)` : ''} 🚀
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerIcon: { fontSize: 26 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#a5b4fc', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  formContainer: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBoxContainer: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
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
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },
  selectedPill: {
    backgroundColor: '#312e81',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  selectedPillText: { color: '#a5b4fc', fontSize: 12, fontWeight: '700' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  loadingText: { color: '#a5b4fc', fontSize: 13 },
  listContent: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySub: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userCardSelected: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3730a3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  defaultAvatarText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  userPhone: { color: '#818cf8', fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkboxText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  footerRow: { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' },
  createBtn: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
