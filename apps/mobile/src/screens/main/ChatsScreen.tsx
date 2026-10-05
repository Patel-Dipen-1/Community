import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetConversationsQuery } from '../../store/api/chatApi';
import { useGetGroupsQuery } from '../../store/api/groupApi';
import { socketService } from '../../services/socket/socketService';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Chats'>;

export const ChatsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');

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

  useEffect(() => {
    socketService.connect();
    socketService.on('message:new', () => {
      refetchConversations();
      refetchGroups();
    });

    return () => {
      socketService.off('message:new');
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchConversations(), refetchGroups()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Messages & Broadcasts"
        subtitle="Real-time WhatsApp-style B2B Communication"
        rightElement={
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => navigation.navigate('BroadcastList')}
          >
            <Text style={styles.fabText}>📢 Broadcast</Text>
          </TouchableOpacity>
        }
      />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'direct' && styles.tabBtnActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
            💬 Direct Chats
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
          data={convData?.conversations || []}
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
                title="No Active Chats Yet"
                description="Start inquiring on products or searching suppliers to begin direct 1-to-1 messaging."
                actionTitle="Browse Products"
                onAction={() => navigation.navigate('Main', { screen: 'Home' })}
              />
            )
          }
          renderItem={({ item }) => {
            const participant = (item as any)?.participant || item?.otherUser || (item as any)?.user2 || (item as any)?.user1 || {};
            const lastMsg = item?.lastMessage;
            const convId = item?.conversationId || (item as any)?.id || '';
            const recipientId = participant?.userId || participant?.id || '';
            const recipientName = participant?.shopName || participant?.fullName || participant?.business?.shopName || 'Business Contact';
            const recipientAvatar = participant?.avatar;

            return (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('ChatDetail', {
                    conversationId: convId,
                    recipientId,
                    recipientName,
                    recipientAvatar,
                  })
                }
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={{
                      uri: recipientAvatar || 'https://via.placeholder.com/100?text=Shop',
                    }}
                    style={styles.avatar}
                  />
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

                  <Text style={styles.cityText}>
                    {participant?.city || participant?.business?.city ? `📍 ${participant?.city || participant?.business?.city}` : 'Verified Business Contact'}
                  </Text>

                  <Text style={styles.snippetText} numberOfLines={1}>
                    {lastMsg?.text || (lastMsg?.productCode ? `📦 Shared Product [${lastMsg.productCode}]` : 'Tap to open chat')}
                  </Text>
                </View>

                {Boolean(item.unreadCount) && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  fabBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fabText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  cityText: { color: '#818cf8', fontSize: 11, marginVertical: 2 },
  snippetText: { color: '#94a3b8', fontSize: 13 },
  capacityBadge: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  unreadBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
});
