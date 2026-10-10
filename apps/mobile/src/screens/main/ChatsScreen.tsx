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
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetConversationsQuery } from '../../store/api/chatApi';
import { useGetGroupsQuery } from '../../store/api/groupApi';
import {
  useGetBroadcastListsQuery,
  useSendBroadcastMessageMutation,
} from '../../store/api/broadcastApi';
import { socketService } from '../../services/socket/socketService';
import { StartChatModal } from '../../components/StartChatModal';
import { CreateGroupModal } from '../../components/CreateGroupModal';
import { CreateBroadcastModal } from '../../components/CreateBroadcastModal';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Chats'>;

export const ChatsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'broadcasts'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Modals visibility state
  const [isStartChatModalVisible, setIsStartChatModalVisible] = useState(false);
  const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] = useState(false);
  const [isCreateBroadcastModalVisible, setIsCreateBroadcastModalVisible] = useState(false);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);

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

  const {
    data: broadcastData,
    isLoading: isBroadcastLoading,
    refetch: refetchBroadcasts,
  } = useGetBroadcastListsQuery();

  const [sendBroadcast] = useSendBroadcastMessageMutation();

  const [refreshing, setRefreshing] = useState(false);

  // Auto refetch conversations, groups & broadcasts whenever screen gets focus
  useFocusEffect(
    useCallback(() => {
      refetchConversations();
      refetchGroups();
      refetchBroadcasts();
    }, [refetchConversations, refetchGroups, refetchBroadcasts])
  );

  useEffect(() => {
    socketService.connect();
    socketService.on('message:new', () => {
      refetchConversations();
      refetchGroups();
      refetchBroadcasts();
    });
    socketService.on('receive_message', () => {
      refetchConversations();
      refetchGroups();
      refetchBroadcasts();
    });

    return () => {
      socketService.off('message:new');
      socketService.off('receive_message');
    };
  }, [refetchConversations, refetchGroups, refetchBroadcasts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchConversations(), refetchGroups(), refetchBroadcasts()]);
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

  const handleGroupCreated = (groupId: string, groupTitle: string) => {
    refetchGroups();
    setActiveTab('groups');
    navigation.navigate('GroupDetail', {
      groupId,
      groupTitle,
    });
  };

  const handleDispatchPrompt = (item: any) => {
    Alert.prompt(
      `📢 Dispatch to ${item.title}`,
      `Type your announcement to send 1-to-1 to all ${item.recipientsCount || item.recipients?.length || 0} contact(s):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch 🚀',
          onPress: async (msgText?: string) => {
            if (!msgText || !msgText.trim()) return;
            try {
              const res = await sendBroadcast({
                id: item.id,
                text: msgText.trim(),
              }).unwrap();

              Alert.alert('Broadcast Sent! 🎉', res.message || `Dispatched to ${res.dispatchedCount} recipient(s).`);
            } catch (err: any) {
              Alert.alert('Dispatch Error', err?.data?.error || err?.message || 'Failed to dispatch broadcast message.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const rawConversations = convData?.conversations || [];
  const rawGroups = groupData?.groups || [];
  const rawBroadcasts = broadcastData?.broadcastLists || [];

  // Calculate total unread count across all direct conversations
  const totalUnreadCount = rawConversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  // Filter Direct Chats
  const filteredDirect = rawConversations
    .filter((item: any) => {
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
    })
    .map((c: any) => ({
      ...c,
      feedType: 'DIRECT',
      sortTime: c.lastMessage?.createdAt
        ? new Date(c.lastMessage.createdAt).getTime()
        : new Date(c.updatedAt || c.createdAt || 0).getTime(),
    }));

  // Filter Groups
  const filteredGroups = rawGroups
    .filter((g: any) => {
      if (!searchFilter.trim()) return true;
      const query = searchFilter.toLowerCase().trim();
      const title = (g.title || '').toLowerCase();
      const desc = (g.description || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    })
    .map((g: any) => ({
      ...g,
      feedType: 'GROUP',
      sortTime: new Date(g.updatedAt || g.createdAt || 0).getTime(),
    }));

  // Filter Broadcasts
  const filteredBroadcasts = rawBroadcasts
    .filter((b: any) => {
      if (!searchFilter.trim()) return true;
      const query = searchFilter.toLowerCase().trim();
      const title = (b.title || '').toLowerCase();
      const desc = (b.description || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    })
    .map((b: any) => ({
      ...b,
      feedType: 'BROADCAST',
      sortTime: new Date(b.lastSentAt || b.createdAt || 0).getTime(),
    }));

  // Combine and sort feed data according to active tab
  let displayFeed: any[] = [];
  if (activeTab === 'all') {
    displayFeed = [...filteredDirect, ...filteredGroups, ...filteredBroadcasts].sort((a, b) => b.sortTime - a.sortTime);
  } else if (activeTab === 'direct') {
    displayFeed = filteredDirect.sort((a, b) => b.sortTime - a.sortTime);
  } else if (activeTab === 'groups') {
    displayFeed = filteredGroups.sort((a, b) => b.sortTime - a.sortTime);
  } else if (activeTab === 'broadcasts') {
    displayFeed = filteredBroadcasts.sort((a, b) => b.sortTime - a.sortTime);
  }

  const isLoading = isConvLoading || isGroupLoading || isBroadcastLoading;

  return (
    <View style={styles.container}>
      <Header
        title="Messages & Broadcasts"
        subtitle="Real-time WhatsApp-style B2B Communication"
        rightElement={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsCreateGroupModalVisible(true)}
            >
              <Text style={styles.headerBtnText}>👥 New Group</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtnSecondary}
              onPress={() => setIsCreateBroadcastModalVisible(true)}
            >
              <Text style={styles.headerBtnSecondaryText}>📢 Broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newChatHeaderBtn}
              onPress={() => setIsStartChatModalVisible(true)}
            >
              <Text style={styles.newChatHeaderBtnText}>📱 Search</Text>
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
            placeholder="Search chats, phone number, groups, or broadcasts..."
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
              onPress={() => setIsActionMenuVisible(true)}
            >
              <Text style={styles.startChatQuickText}>+ Create</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* WhatsApp-Style 4-Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            💬 All ({displayFeed.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'direct' && styles.tabBtnActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
            📱 Direct {totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'groups' && styles.tabBtnActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            👥 Groups ({filteredGroups.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'broadcasts' && styles.tabBtnActive]}
          onPress={() => setActiveTab('broadcasts')}
        >
          <Text style={[styles.tabText, activeTab === 'broadcasts' && styles.tabTextActive]}>
            📢 Lists ({filteredBroadcasts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Unified WhatsApp-Style Chat List */}
      <FlatList
        data={displayFeed}
        keyExtractor={(item, index) =>
          `${item.feedType}-${item.conversationId || item.id || index}`
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={styles.loadingText}>Loading chats, groups & broadcasts...</Text>
          ) : (
            <EmptyState
              icon="💬"
              title={searchFilter ? "No Matching Chats Found" : "No Conversations Yet"}
              description={
                searchFilter
                  ? `No chats, groups or broadcasts matched "${searchFilter}".`
                  : "Start inquiring on products, create trade groups, or search phone numbers to start messaging."
              }
              actionTitle="📱 Search Phone Number"
              onAction={() => setIsStartChatModalVisible(true)}
            />
          )
        }
        renderItem={({ item }) => {
          // RENDER 1: DIRECT CHAT CARD
          if (item.feedType === 'DIRECT') {
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

                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeCount}>{unreadCount}</Text>
                    <Text style={styles.unreadBadgeLabel}>{unreadCount === 1 ? 'msg' : 'msgs'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }

          // RENDER 2: TRADE GROUP CARD
          if (item.feedType === 'GROUP') {
            return (
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
                  <Text style={styles.groupIcon}>👥</Text>
                </View>

                <View style={styles.chatDetails}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.shopTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.capacityBadge}>
                      👥 {item.currentMembersCount || 1}/{item.maxCapacity || 40}
                    </Text>
                  </View>

                  <View style={styles.subDetailsRow}>
                    <View style={styles.groupTypeBadge}>
                      <Text style={styles.groupTypeBadgeText}>
                        {item.onlyAdminCanPost ? '🔒 Admin Broadcast Only' : '💬 Open Discussion Group'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.snippetText} numberOfLines={1}>
                    {item.description || 'Tap to view group discussion...'}
                  </Text>
                </View>

                <View style={styles.groupTagBadge}>
                  <Text style={styles.groupTagBadgeText}>GROUP</Text>
                </View>
              </TouchableOpacity>
            );
          }

          // RENDER 3: BROADCAST LIST CARD
          if (item.feedType === 'BROADCAST') {
            const recipientCount = item.recipientsCount ?? item.recipients?.length ?? 0;

            return (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.8}
                onPress={() => handleDispatchPrompt(item)}
              >
                <View style={styles.broadcastIconBox}>
                  <Text style={styles.broadcastIcon}>📢</Text>
                </View>

                <View style={styles.chatDetails}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.shopTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.timeText}>
                      {item.lastSentAt ? new Date(item.lastSentAt).toLocaleDateString() : 'Broadcast List'}
                    </Text>
                  </View>

                  <View style={styles.subDetailsRow}>
                    <View style={styles.broadcastRecipientPill}>
                      <Text style={styles.broadcastRecipientPillText}>📢 {recipientCount} Verified Contacts</Text>
                    </View>
                  </View>

                  <Text style={styles.snippetText} numberOfLines={1}>
                    {item.description || 'Tap to dispatch 1-to-1 SKU updates...'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.dispatchQuickBtn} onPress={() => handleDispatchPrompt(item)}>
                  <Text style={styles.dispatchQuickBtnText}>Dispatch ➔</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }

          return null;
        }}
      />

      {/* WhatsApp-Style Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.floatingStartChatFab}
        activeOpacity={0.85}
        onPress={() => setIsActionMenuVisible(true)}
      >
        <Text style={styles.floatingFabIcon}>💬</Text>
        <Text style={styles.floatingFabText}>+ New</Text>
      </TouchableOpacity>

      {/* WhatsApp-Style Action Menu Modal */}
      <Modal visible={isActionMenuVisible} animationType="fade" transparent onRequestClose={() => setIsActionMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionMenuVisible(false)}>
          <View style={styles.actionMenuOverlay}>
            <View style={styles.actionMenuContainer}>
              <Text style={styles.actionMenuHeaderTitle}>WhatsApp Options</Text>
              
              {/* Option 1: Direct Phone Search */}
              <TouchableOpacity
                style={styles.actionOptionRow}
                onPress={() => {
                  setIsActionMenuVisible(false);
                  setIsStartChatModalVisible(true);
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#312e81' }]}>
                  <Text style={styles.actionOptionIcon}>📱</Text>
                </View>
                <View style={styles.actionOptionMeta}>
                  <Text style={styles.actionOptionTitle}>New Direct Chat</Text>
                  <Text style={styles.actionOptionSub}>Search by 10-digit mobile number</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Create Group */}
              <TouchableOpacity
                style={styles.actionOptionRow}
                onPress={() => {
                  setIsActionMenuVisible(false);
                  setIsCreateGroupModalVisible(true);
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#065f46' }]}>
                  <Text style={styles.actionOptionIcon}>👥</Text>
                </View>
                <View style={styles.actionOptionMeta}>
                  <Text style={styles.actionOptionTitle}>New Trade Group</Text>
                  <Text style={styles.actionOptionSub}>Create community group for buyers & suppliers</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Create Broadcast List */}
              <TouchableOpacity
                style={styles.actionOptionRow}
                onPress={() => {
                  setIsActionMenuVisible(false);
                  setIsCreateBroadcastModalVisible(true);
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#831843' }]}>
                  <Text style={styles.actionOptionIcon}>📢</Text>
                </View>
                <View style={styles.actionOptionMeta}>
                  <Text style={styles.actionOptionTitle}>New Broadcast List</Text>
                  <Text style={styles.actionOptionSub}>Send 1-to-1 SKU updates to multiple contacts</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modals */}
      <StartChatModal
        visible={isStartChatModalVisible}
        onClose={() => setIsStartChatModalVisible(false)}
        onSelectUser={handleSelectUserFromModal}
      />

      <CreateGroupModal
        visible={isCreateGroupModalVisible}
        onClose={() => setIsCreateGroupModalVisible(false)}
        onGroupCreated={handleGroupCreated}
      />

      <CreateBroadcastModal
        visible={isCreateBroadcastModalVisible}
        onClose={() => setIsCreateBroadcastModalVisible(false)}
        onListCreated={() => {
          refetchBroadcasts();
          setActiveTab('broadcasts');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerBtn: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  headerBtnText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  headerBtnSecondary: {
    backgroundColor: '#831843',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  headerBtnSecondaryText: {
    color: '#f472b6',
    fontSize: 10,
    fontWeight: '800',
  },
  newChatHeaderBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  newChatHeaderBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
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
  tabText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
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
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  groupIcon: { fontSize: 22 },
  broadcastIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#831843',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f472b6',
  },
  broadcastIcon: { fontSize: 22 },
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
  groupTypeBadge: {
    backgroundColor: '#022c22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#065f46',
  },
  groupTypeBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  broadcastRecipientPill: {
    backgroundColor: '#500724',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9d174d',
  },
  broadcastRecipientPillText: {
    color: '#f472b6',
    fontSize: 10,
    fontWeight: '800',
  },
  cityText: { color: '#818cf8', fontSize: 11, flexShrink: 1 },
  snippetText: { color: '#94a3b8', fontSize: 13 },
  capacityBadge: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  groupTagBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  groupTagBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  dispatchQuickBtn: {
    backgroundColor: '#831843',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  dispatchQuickBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
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
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  actionMenuContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  actionMenuHeaderTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionOptionIcon: {
    fontSize: 20,
  },
  actionOptionMeta: {
    flex: 1,
  },
  actionOptionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  actionOptionSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
});
