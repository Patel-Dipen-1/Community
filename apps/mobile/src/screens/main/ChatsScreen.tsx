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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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

  // BUG-017: Cross-platform Broadcast Dispatch Modal (replaces iOS-only Alert.prompt)
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [selectedBroadcastItem, setSelectedBroadcastItem] = useState<any | null>(null);
  const [broadcastDispatchText, setBroadcastDispatchText] = useState('');

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
    socketService.on('receive_message', () => {
      refetchConversations();
      refetchGroups();
      refetchBroadcasts();
    });

    return () => {
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
    setSelectedBroadcastItem(item);
    setBroadcastDispatchText('');
    setDispatchModalVisible(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedBroadcastItem || !broadcastDispatchText.trim()) return;
    try {
      const res = await sendBroadcast({
        id: selectedBroadcastItem.id,
        text: broadcastDispatchText.trim(),
      }).unwrap();

      setDispatchModalVisible(false);
      setSelectedBroadcastItem(null);
      setBroadcastDispatchText('');
      Alert.alert('Broadcast Sent! 🎉', res.message || `Dispatched to ${res.dispatchedCount} recipient(s).`);
    } catch (err: any) {
      Alert.alert('Dispatch Error', err?.data?.error || err?.message || 'Failed to dispatch broadcast message.');
    }
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
        title="Messages & Groups"
        subtitle="WhatsApp-Style B2B Network"
        rightElement={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: '#064e3b', borderColor: '#059669' }]}
              onPress={() => setIsCreateGroupModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="New Group"
            >
              <Text style={styles.headerActionIcon}>👥</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: '#831843', borderColor: '#db2777' }]}
              onPress={() => setIsCreateBroadcastModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="New Broadcast"
            >
              <Text style={styles.headerActionIcon}>📢</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: '#312e81', borderColor: '#6366f1' }]}
              onPress={() => setIsStartChatModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Search Phone Contact"
            >
              <Text style={styles.headerActionIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Quick Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats, phone, groups..."
            placeholderTextColor="#64748b"
            value={searchFilter}
            onChangeText={setSearchFilter}
            returnKeyType="search"
          />
          {searchFilter.trim().length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchFilter('')}
              style={styles.clearSearchBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.startChatQuickBtn}
              onPress={() => setIsActionMenuVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.startChatQuickText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modern Responsive Horizontal Filter Chips */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              💬 All ({displayFeed.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'direct' && styles.tabBtnActive]}
            onPress={() => setActiveTab('direct')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
              📱 Direct {totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'groups' && styles.tabBtnActive]}
            onPress={() => setActiveTab('groups')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              👥 Groups ({filteredGroups.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'broadcasts' && styles.tabBtnActive]}
            onPress={() => setActiveTab('broadcasts')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'broadcasts' && styles.tabTextActive]}>
              📢 Lists ({filteredBroadcasts.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Unified WhatsApp-Style Chat List */}
      <FlatList
        data={displayFeed}
        keyExtractor={(item, index) =>
          `${item.feedType}-${item.conversationId || item.id || index}`
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={styles.loadingText}>Loading chats, groups & broadcasts...</Text>
          ) : (
            <EmptyState
              icon="💬"
              title={searchFilter ? 'No Matching Chats Found' : 'No Conversations Yet'}
              description={
                searchFilter
                  ? `No chats, groups or broadcasts matched "${searchFilter}".`
                  : 'Start inquiring on products, create trade groups, or search phone numbers to start messaging.'
              }
              actionTitle="🔍 Search Phone Number"
              onAction={() => setIsStartChatModalVisible(true)}
            />
          )
        }
        ListFooterComponent={
          displayFeed.length > 0 && displayFeed.length <= 4 ? (
            <View style={styles.discoveryCard}>
              <View style={styles.discoveryHeader}>
                <Text style={styles.discoveryIcon}>💡</Text>
                <Text style={styles.discoveryTitle}>B2B Network Pro Tip</Text>
              </View>
              <Text style={styles.discoverySubtitle}>
                Connect directly with verified suppliers & buyers across clothing, jewellery, electronics, and hardware. Tap "+ New" to search 10-digit mobile numbers or start trade groups.
              </Text>
            </View>
          ) : null
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
                activeOpacity={0.7}
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
                      {lastMsg?.createdAt
                        ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </Text>
                  </View>

                  <View style={styles.subDetailsRow}>
                    {mobileNumber ? (
                      <View style={styles.phoneTag}>
                        <Text style={styles.phoneTagText}>📱 {mobileNumber}</Text>
                      </View>
                    ) : null}
                    {participant?.city || (participant?.business as any)?.city ? (
                      <Text style={styles.cityText} numberOfLines={1}>
                        📍 {participant?.city || (participant?.business as any)?.city}
                      </Text>
                    ) : (
                      <Text style={styles.cityText}>Verified Contact</Text>
                    )}
                  </View>

                  <View style={styles.chatSnippetRow}>
                    <Text style={styles.snippetText} numberOfLines={1}>
                      {lastMsg?.type === 'IMAGE' || (lastMsg?.mediaUrl && !lastMsg?.text)
                        ? '📷 Photo'
                        : lastMsg?.text || 'Tap to open conversation...'}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeCount}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // RENDER 2: GROUP CHAT CARD
          if (item.feedType === 'GROUP') {
            return (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.7}
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
                        {item.onlyAdminCanPost ? '🔒 Admin Broadcast Only' : '🌐 Open Discussion Group'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chatSnippetRow}>
                    <Text style={styles.snippetText} numberOfLines={1}>
                      {item.description || 'Tap to view group discussion...'}
                    </Text>
                    <View style={styles.groupTagBadge}>
                      <Text style={styles.groupTagBadgeText}>GROUP</Text>
                    </View>
                  </View>
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
                activeOpacity={0.7}
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
                      <Text style={styles.broadcastRecipientPillText}>📱 {recipientCount} Verified Contacts</Text>
                    </View>
                  </View>

                  <View style={styles.chatSnippetRow}>
                    <Text style={styles.snippetText} numberOfLines={1}>
                      {item.description || 'Tap to dispatch 1-to-1 SKU updates...'}
                    </Text>
                    <TouchableOpacity
                      style={styles.dispatchQuickBtn}
                      onPress={() => handleDispatchPrompt(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dispatchQuickBtnText}>Dispatch 🚀</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return null;
        }}
      />

      {/* Modern WhatsApp-Style Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[
          styles.floatingStartChatFab,
          { bottom: 20 + Math.max(insets.bottom, 10) },
        ]}
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
              <Text style={styles.actionMenuHeaderTitle}>Quick Actions</Text>

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

      {/* BUG-017: Cross-platform Broadcast Dispatch Modal */}
      <Modal
        visible={dispatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDispatchModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dispatchModalOverlay}
        >
          <View style={styles.dispatchModalCard}>
            <Text style={styles.dispatchModalTitle}>
              📢 Dispatch to {selectedBroadcastItem?.title || 'Broadcast List'}
            </Text>
            <Text style={styles.dispatchModalSub}>
              Type your announcement to send 1-to-1 to all {selectedBroadcastItem?.recipientsCount || selectedBroadcastItem?.recipients?.length || 0} contact(s):
            </Text>
            <TextInput
              style={styles.dispatchModalInput}
              placeholder="Enter announcement text..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={broadcastDispatchText}
              onChangeText={setBroadcastDispatchText}
            />
            <View style={styles.dispatchModalBtnRow}>
              <TouchableOpacity
                style={styles.dispatchCancelBtn}
                onPress={() => setDispatchModalVisible(false)}
              >
                <Text style={styles.dispatchCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dispatchSubmitBtn, !broadcastDispatchText.trim() && { opacity: 0.5 }]}
                disabled={!broadcastDispatchText.trim()}
                onPress={handleConfirmDispatch}
              >
                <Text style={styles.dispatchSubmitBtnText}>Dispatch 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerActionIcon: {
    fontSize: 16,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearSearchText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  startChatQuickBtn: {
    backgroundColor: '#312e81',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4338ca',
    marginLeft: 6,
  },
  startChatQuickText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '700',
  },
  tabContainer: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 90,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#1e293b',
    marginLeft: 74,
    opacity: 0.5,
  },
  loadingText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 30,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1e293b',
  },
  defaultAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3730a3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  defaultAvatarText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#020617',
  },
  groupIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  groupIcon: {
    fontSize: 20,
  },
  broadcastIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#831843',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f472b6',
  },
  broadcastIcon: {
    fontSize: 20,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  subDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  phoneTag: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  phoneTagText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '700',
  },
  groupTypeBadge: {
    backgroundColor: '#022c22',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#065f46',
  },
  groupTypeBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  broadcastRecipientPill: {
    backgroundColor: '#500724',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9d174d',
  },
  broadcastRecipientPillText: {
    color: '#f472b6',
    fontSize: 10,
    fontWeight: '700',
  },
  cityText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  chatSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  snippetText: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
    marginRight: 6,
  },
  capacityBadge: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  groupTagBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  groupTagBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  dispatchQuickBtn: {
    backgroundColor: '#831843',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 6,
  },
  dispatchQuickBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeCount: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  discoveryCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#0b1329',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  discoveryIcon: {
    fontSize: 16,
  },
  discoveryTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  discoverySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  floatingStartChatFab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#818cf8',
    gap: 6,
  },
  floatingFabIcon: {
    fontSize: 16,
  },
  floatingFabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '700',
  },
  actionOptionSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  dispatchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dispatchModalCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  dispatchModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  dispatchModalSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 18,
  },
  dispatchModalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#ffffff',
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dispatchModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dispatchCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  dispatchCancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  dispatchSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
  },
  dispatchSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
