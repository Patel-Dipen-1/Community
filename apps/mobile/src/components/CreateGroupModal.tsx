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
  Switch,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useCreateGroupMutation } from '../store/api/groupApi';
import { useLazySearchUsersQuery, SearchedUserItem } from '../store/api/chatApi';
import { useAppSelector } from '../hooks/useRedux';
import { useGetMyStoreQuery } from '../store/api/storeApi';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated?: (groupId: string, groupTitle: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const { data: storeData } = useGetMyStoreQuery();

  // Extract allowed trade communities dynamically
  const rawAllowed: string[] = (
    user?.business?.allowedCommunities ||
    storeData?.store?.business?.allowedCommunities ||
    (user as any)?.allowedCommunities ||
    []
  )
    .map((a: string) => String(a).toLowerCase().trim())
    .filter(Boolean);

  const isSuperAdmin =
    user?.email === 'dnpatel2002@gmail.com' ||
    user?.business?.assignedRole === 'SUPER_ADMIN' ||
    (user as any)?.assignedRole === 'SUPER_ADMIN';

  const MASTER_COMMUNITIES: Record<string, { slug: string; label: string }> = {
    clothing: { slug: 'clothing', label: '👕 Clothing' },
    hardware: { slug: 'hardware', label: '🔧 Hardware & Tools' },
    jewellery: { slug: 'jewellery', label: '💎 Jewellery' },
    jewelry: { slug: 'jewellery', label: '💎 Jewellery' },
    footwear: { slug: 'footwear', label: '👟 Footwear' },
    electronics: { slug: 'electronics', label: '⚡ Electronics' },
    grocery: { slug: 'grocery', label: '🌾 Grocery' },
  };

  let categoriesList: { slug: string; label: string }[] = [];

  if (isSuperAdmin || rawAllowed.includes('*') || rawAllowed.length === 0) {
    categoriesList = [
      MASTER_COMMUNITIES.clothing,
      MASTER_COMMUNITIES.hardware,
      MASTER_COMMUNITIES.jewellery,
      MASTER_COMMUNITIES.footwear,
      MASTER_COMMUNITIES.electronics,
    ];
  } else {
    categoriesList = rawAllowed.map((item) => {
      const lower = item.toLowerCase();
      if (MASTER_COMMUNITIES[lower]) {
        return MASTER_COMMUNITIES[lower];
      }
      return {
        slug: lower,
        label: `🏷️ ${item.charAt(0).toUpperCase() + item.slice(1)}`,
      };
    });
  }

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [onlyAdminCanPost, setOnlyAdminCanPost] = useState(false);
  const [hideMemberIdentity, setHideMemberIdentity] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoriesList[0]?.slug || 'clothing');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SearchedUserItem[]>([]);

  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [triggerSearch, { data: searchData, isFetching: isSearching }] = useLazySearchUsersQuery();

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setTitle('');
      setDescription('');
      setOnlyAdminCanPost(false);
      setHideMemberIdentity(true);
      setSearchQuery('');
      setSelectedUsers([]);
    } else {
      if (categoriesList.length > 0) {
        setSelectedCategory(categoriesList[0].slug);
      }
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

  const handleNextStep = () => {
    if (!title.trim()) {
      Alert.alert('Group Title Required', 'Please enter a title for your group.');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Group Title Required', 'Please enter a title for your group.');
      return;
    }

    try {
      const memberUserIds = selectedUsers.map((u) => u.userId);

      const res = await createGroup({
        title: title.trim(),
        description: description.trim() || undefined,
        communitySlug: selectedCategory,
        onlyAdminCanPost,
        hideMemberIdentity,
        membersCanSeeMemberList: !hideMemberIdentity,
        memberUserIds,
      } as any).unwrap();

      const createdGroup = res.group || (res as any);
      const groupId = createdGroup?.id || (createdGroup as any)?.groupId;

      Alert.alert('Group Created! 🎉', `Group "${title}" has been created successfully.`);
      onClose();
      if (onGroupCreated && groupId) {
        onGroupCreated(groupId, title.trim());
      }
    } catch (err: any) {
      Alert.alert(
        'Creation Failed',
        err?.data?.error || err?.message || 'Failed to create group. Please check your network and account status.'
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerIcon}>👥</Text>
                <View>
                  <Text style={styles.headerTitle}>Create New Trade Group</Text>
                  <Text style={styles.headerSubtitle}>
                    {step === 1 ? 'Step 1 of 2: Group Details & Settings' : `Step 2 of 2: Add Members (${selectedUsers.length} selected)`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content Body */}
            {step === 1 ? (
              <View style={styles.stepContent}>
                {/* Group Title Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Group Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Surat Wholesale Sarees Hub"
                    placeholderTextColor="#64748b"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Group Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description & Rules (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Share group rules, payment terms, or update schedules..."
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* Dynamic Allowed Community Category Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Target Industry Community {!isSuperAdmin ? '(Your Allowed Category)' : ''}
                  </Text>
                  <View style={styles.categoryRow}>
                    {categoriesList.map((cat) => (
                      <TouchableOpacity
                        key={cat.slug}
                        style={[
                          styles.catPill,
                          selectedCategory === cat.slug && styles.catPillActive,
                        ]}
                        onPress={() => setSelectedCategory(cat.slug)}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            selectedCategory === cat.slug && styles.catPillTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Settings Switches */}
                <View style={styles.switchBox}>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>🔒 Only Admin Can Post</Text>
                      <Text style={styles.switchSub}>Restrict posting to group creator & admins</Text>
                    </View>
                    <Switch
                      value={onlyAdminCanPost}
                      onValueChange={setOnlyAdminCanPost}
                      trackColor={{ false: '#334155', true: '#4f46e5' }}
                      thumbColor={onlyAdminCanPost ? '#818cf8' : '#94a3b8'}
                    />
                  </View>

                  <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>🛡️ Anonymous Member List</Text>
                      <Text style={styles.switchSub}>Protect privacy by hiding member phone numbers from competitors</Text>
                    </View>
                    <Switch
                      value={hideMemberIdentity}
                      onValueChange={setHideMemberIdentity}
                      trackColor={{ false: '#334155', true: '#4f46e5' }}
                      thumbColor={hideMemberIdentity ? '#818cf8' : '#94a3b8'}
                    />
                  </View>
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.8}
                  onPress={handleNextStep}
                >
                  <Text style={styles.primaryBtnText}>Next: Select Members ➔</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Search Bar for adding members */}
                <View style={styles.searchBoxContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search phone number or contact name..."
                      placeholderTextColor="#64748b"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selected Pills */}
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

                {/* Search list of contacts */}
                <FlatList
                  data={searchResults}
                  keyExtractor={(u) => u.userId}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    !isSearching ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📱</Text>
                        <Text style={styles.emptyTitle}>Add Members by Phone Number</Text>
                        <Text style={styles.emptySub}>
                          Type any 10-digit mobile number or contact name to invite members to your trade group.
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

                {/* Footer Buttons */}
                <View style={styles.footerRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                    <Text style={styles.backBtnText}>← Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                    activeOpacity={0.8}
                    disabled={isCreating}
                    onPress={handleFinalSubmit}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        Create Group {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''} 🚀
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  stepContent: { padding: 20 },
  inputGroup: { marginBottom: 18 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPillActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  catPillText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  catPillTextActive: { color: '#ffffff' },
  switchBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  switchTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  switchSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
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
  emptyContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
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
  footerRow: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' },
  backBtn: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  backBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
});
