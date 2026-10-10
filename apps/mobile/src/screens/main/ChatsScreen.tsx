import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetConversationsQuery } from '../../store/api/chatApi';
import { useGetGroupsQuery } from '../../store/api/groupApi';
import { socketService } from '../../services/socket/socketService';
import { StartChatModal } from '../../components/StartChatModal';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Chats'>;

export const ChatsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [searchFilter, setSearchFilter] = useState('');
  const [isStartChatModalVisible, setIsStartChatModalVisible] = useState(false);

  const {
    data: convData,
    isLoading: isConvLoading,
    refetch: refetchConversations,
  } = useGetConversationsQuery();

  const {
    data: groupData,
    isLoading: isGroupLoading,
    refetch: refetchGroups,
  } = useGetGroupsQuery({});

  const [refreshing, setRefreshing] = useState(false);

  // Auto refetch conversations whenever screen gets focus (e.g. returning from ChatDetail)
  useFocusEffect(
    useCallback(() => {
      refetchConversations();
      refetchGroups();
    }, [refetchConversations, refetchGroups])
  );

  useEffect(() => {
    socketService.connect();
    socketService.on('message:new', () => {
      refetchConversations();
      refetchGroups();
    });
    socketService.on('receive_message', () => {
      refetchConversations();
      refetchGroups();
    });

    return () => {
      socketService.off('message:new');
      socketService.off('receive_message');
    };
  }, [refetchConversations, refetchGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchConversations(), refetchGroups()]);
    setRefreshing(false);
  };

  const handleSelectUserFromModal = (selectedUser: {
    userId: string;
    fullName: string;
    shopName?: string;
    avatar?: string;
    mobileNumber: string;
  }) => {
    navigation.navigate('ChatDetail', {
      conversationId: '',
      recipientId: selectedUser.userId,
      recipientName: selectedUser.shopName || selectedUser.fullName,
      recipientAvatar: selectedUser.avatar,
    });
  };

  const rawConversations = convData?.conversations || [];
  
  // Calculate total unread count across all direct conversations
  const totalUnreadCount = rawConversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  const filteredConversations = rawConversations.filter((item: any) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase().trim();
    const participant = item?.participant || item?.otherUser || item?.user2 || item?.user1 || {};
    const name = (participant?.shopName || participant?.fullName || '').toLowerCase();
    const mobile = (participant?.mobileNumber || '').toLowerCase();
    const city = (participant?.city || participant?.business?.city || '').toLowerCase();
    const lastText = (item?.lastMessage?.text || '').toLowerCase();

    return (
      name.includes(query) ||
      mobile.includes(query) ||
      city.includes(query) ||
      lastText.includes(query)
    );
  });

  // Sort conversations strictly by latest message timestamp (most recent message first)
  const sortedConversations = [...filteredConversations].sort((a: any, b: any) => {
    const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Messages & Broadcasts"
        subtitle="Real-time WhatsApp-style B2B Communication"
        rightElement={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.newChatHeaderBtn}
              onPress={() => setIsStartChatModalVisible(true)}
            >
              <Text style={styles.newChatHeaderBtnText}>📱 Search Number</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabBtn}
              onPress={() => navigation.navigate('BroadcastList')}
            >
              <Text style={styles.fabText}>📢 Broadcast</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Quick Phone Number & Contact Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search phone number, supplier, or chat..."
            placeholderTextColor="#64748b"
            value={searchFilter}
            onChangeText={setSearchFilter}
          />
          {searchFilter.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchFilter('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.startChatQuickBtn}
              onPress={() => setIsStartChatModalVisible(true)}
            >
              <Text style={styles.startChatQuickText}>+ New Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'direct' && styles.tabBtnActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
            💬 Direct Chats {totalUnreadCount > 0 ? `(${totalUnreadCount} unread)` : `(${sortedConversations.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'groups' && styles.tabBtnActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            📢 Trade Groups ({groupData?.groups?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List Container */}
      {activeTab === 'direct' ? (
        <FlatList
          data={sortedConversations}
          keyExtractor={(item, index) => item?.conversationId || (item as any)?.id || `conv-${index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
          }
          ListEmptyComponent={
            isConvLoading ? (
              <Text style={styles.loadingText}>Loading conversations...</Text>
            ) : (
              <EmptyState
                icon="💬"
                title={searchFilter ? "No Matching Conversations" : "No Active Chats Yet"}
                description={
                  searchFilter
                    ? `No chats matched "${searchFilter}". Tap 'Search Number' to find new suppliers or buyers by phone number.`
                    : "Start inquiring on products or search phone numbers to begin direct messaging."
                }
                actionTitle="📱 Search Phone Number"
                onAction={() => setIsStartChatModalVisible(true)}
              />
            )
          }
          renderItem={({ item }) => {
            const participant = (item as any)?.participant || item?.otherUser || (item as any)?.user2 || (item as any)?.user1 || {};
            const lastMsg = item?.lastMessage;
            const convId = item?.conversationId || (item as any)?.id || '';
            const recipientId = participant?.userId || participant?.id || '';
            const recipientName = participant?.shopName || participant?.fullName || participant?.business?.shopName || 'Business Contact';
            const recipientAvatar = participant?.avatar || participant?.logoUrl || participant?.image || (participant?.business as any)?.logoUrl;
            const mobileNumber = participant?.mobileNumber || (participant as any)?.phone;
            const initialChar = (recipientName || 'U').charAt(0).toUpperCase();
            const unreadCount = Number(item.unreadCount) || 0;

            return (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('ChatDetail', {
                    conversationId: convId,
                    recipientId,
                    recipientName,
                    recipientAvatar: typeof recipientAvatar === 'string' ? recipientAvatar : undefined,
                  })
                }
              >
                <View style={styles.avatarContainer}>
                  {recipientAvatar && typeof recipientAvatar === 'string' && recipientAvatar.startsWith('http') ? (
                    <Image source={{ uri: recipientAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.defaultAvatarCircle}>
                      <Text style={styles.defaultAvatarText}>{initialChar}</Text>
                    </View>
                  )}
                  <View style={styles.onlineDot} />
                </View>

                <View style={styles.chatDetails}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.shopTitle} numberOfLines={1}>
                      {recipientName}
                    </Text>

                    <Text style={styles.timeText}>
                      {lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>

                  <View style={styles.subDetailsRow}>
                    {mobileNumber ? (
                      <View style={styles.phoneTag}>
                        <Text style={styles.phoneTagText}>📱 {mobileNumber}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.cityText} numberOfLines={1}>
                      {participant?.city || participant?.business?.city ? `📍 ${participant?.city || participant?.business?.city}` : 'Verified Contact'}
                    </Text>
                  </View>

                  <Text style={styles.snippetText} numberOfLines={1}>
                    {lastMsg?.text || (lastMsg?.productCode ? `📦 Shared Product [${lastMsg.productCode}]` : 'Tap to open chat')}
                  </Text>
                </View>

                {/* Unread Message Notification Badge */}
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeCount}>{unreadCount}</Text>
                    <Text style={styles.unreadBadgeLabel}>{unreadCount === 1 ? 'msg' : 'msgs'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={groupData?.groups || []}
          keyExtractor={(item, index) => item?.id || `group-${index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
          }
          ListEmptyComponent={
            isGroupLoading ? (
              <Text style={styles.loadingText}>Loading trade groups...</Text>
            ) : (
              <EmptyState
                icon="📢"
                title="No Trade Groups"
                description="Join verified supplier channels or create a broadcast list to send product updates."
              />
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('GroupDetail', {
                  groupId: item.id,
                  groupTitle: item.title,
                })
              }
            >
              <View style={styles.groupIconBox}>
                <Text style={styles.groupIcon}>📢</Text>
              </View>

              <View style={styles.chatDetails}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.shopTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.capacityBadge}>
                    {item.currentMembersCount || 1}/{item.maxCapacity}
                  </Text>
                </View>

                <Text style={styles.cityText}>
                  {item.onlyAdminCanPost ? '🔒 Admin Broadcast Only' : '💬 Open Discussion Group'}
                </Text>

                <Text style={styles.snippetText} numberOfLines={1}>
                  {item.description || 'Tap to join broadcast updates...'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button (FAB) for Start Chat by Phone Number */}
      <TouchableOpacity
        style={styles.floatingStartChatFab}
        activeOpacity={0.85}
        onPress={() => setIsStartChatModalVisible(true)}
      >
        <Text style={styles.floatingFabIcon}>💬</Text>
        <Text style={styles.floatingFabText}>Start Chat</Text>
      </TouchableOpacity>

      {/* Start Chat Modal */}
      <StartChatModal
        visible={isStartChatModalVisible}
        onClose={() => setIsStartChatModalVisible(false)}
        onSelectUser={handleSelectUserFromModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newChatHeaderBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newChatHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  fabBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fabText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  startChatQuickBtn: {
    backgroundColor: '#312e81',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  startChatQuickText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#ffffff' },
  loadingText: { color: '#94a3b8', textAlign: 'center', marginVertical: 30 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e293b' },
  defaultAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3730a3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  defaultAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#020617',
  },
  groupIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  groupIcon: { fontSize: 22 },
  chatDetails: { flex: 1 },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  timeText: { color: '#64748b', fontSize: 11 },
  subDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3,
  },
  phoneTag: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  phoneTagText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '800',
  },
  cityText: { color: '#818cf8', fontSize: 11, flexShrink: 1 },
  snippetText: { color: '#94a3b8', fontSize: 13 },
  capacityBadge: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  unreadBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  unreadBadgeLabel: {
    color: '#d1fae5',
    fontSize: 9,
    fontWeight: '700',
  },
  floatingStartChatFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#818cf8',
    gap: 6,
  },
  floatingFabIcon: {
    fontSize: 18,
  },
  floatingFabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
