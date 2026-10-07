import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { ProductCard } from '../../components/common/ProductCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useGetStatusesQuery, useViewStatusMutation, useGetStatusViewersQuery, StatusItem } from '../../store/api/statusApi';
import { colors, spacing, borderRadius } from '../../theme/theme';
import { useAppSelector } from '../../hooks/useRedux';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeCommunity, setActiveCommunity] = useState<string>('clothing');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useGetProductsQuery({
    communitySlug: activeCommunity,
    search: searchQuery,
  });

  const {
    data: statusesData,
    refetch: refetchStatuses,
  } = useGetStatusesQuery({ category: activeCommunity });

  const [refreshing, setRefreshing] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StatusItem[] | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  const [viewStatus] = useViewStatusMutation();

  const currentActiveStory = activeStoryGroup?.[activeStoryIndex];

  const { data: viewersData, isLoading: isLoadingViewers } = useGetStatusViewersQuery(
    currentActiveStory?.id || '',
    { skip: !currentActiveStory?.id || !showViewersSheet }
  );

  const handleOpenStoryGroup = (group: StatusItem[], startIdx = 0) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(startIdx);
    setShowViewersSheet(false);
    if (group[startIdx]?.id) {
      try {
        viewStatus(group[startIdx].id);
      } catch (e) {
        console.warn('View status record error:', e);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchStatuses()]);
    setRefreshing(false);
  };

  const communities = [
    { slug: 'clothing', name: '👕 Clothing' },
    { slug: 'jewellery', name: '💎 Jewellery' },
    { slug: 'electronics', name: '⚡ Electronics' },
    { slug: 'hardware', name: '🔧 Hardware' },
  ];

  // Group all feed statuses strictly by poster userId
  const groupedStatuses: { [userId: string]: StatusItem[] } = {};
  statusesData?.statuses?.forEach((st) => {
    if (!groupedStatuses[st.userId]) {
      groupedStatuses[st.userId] = [];
    }
    groupedStatuses[st.userId].push(st);
  });

  const myStatusList = groupedStatuses[user?.id || ''] || [];
  const otherPosterUserIds = Object.keys(groupedStatuses).filter((uid) => uid !== user?.id);

  return (
    <View style={styles.container}>
      <Header
        title="B2B Trade Platform"
        subtitle={`Verified Account: ${user?.business?.shopName || user?.fullName}`}
        rightElement={
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
          >
            <Text style={styles.profileBadgeText}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by title or SKU code..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Community Switcher Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communityBar}>
          {communities.map((c) => {
            const isActive = activeCommunity === c.slug;
            return (
              <TouchableOpacity
                key={c.slug}
                style={[styles.communityPill, isActive && styles.communityPillActive]}
                onPress={() => setActiveCommunity(c.slug)}
              >
                <Text style={[styles.communityText, isActive && styles.communityTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 24h Stories / Status Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📸 Active Supplier Updates</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateStatus')}>
            <Text style={styles.sectionAction}>+ Post Status</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusesBar}>
          {/* MY STATUS ITEM */}
          <View style={styles.statusItem}>
            <TouchableOpacity
              style={[styles.statusRing, myStatusList.length > 0 ? styles.statusRingUnseen : styles.statusRingAdd]}
              onPress={() => {
                if (myStatusList.length > 0) {
                  handleOpenStoryGroup(myStatusList, 0);
                } else {
                  navigation.navigate('CreateStatus');
                }
              }}
            >
              {user?.avatar || myStatusList[0]?.mediaUrl ? (
                <Image source={{ uri: user?.avatar || myStatusList[0]?.mediaUrl }} style={styles.statusAvatar} />
              ) : (
                <View style={styles.statusAvatarFallback}>
                  <Text style={styles.statusAvatarFallbackText}>
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.addStatusBadgeBtn}
                onPress={() => navigation.navigate('CreateStatus')}
              >
                <Text style={styles.addStatusBadgeText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            <Text style={styles.statusName} numberOfLines={1}>
              My Status
            </Text>
          </View>

          {/* OTHER SUPPLIERS' STATUS UPDATES (Grouped per vendor) */}
          {otherPosterUserIds.map((posterUid) => {
            const vendorStatuses = groupedStatuses[posterUid];
            const latestStatus = vendorStatuses[0];
            const posterName = latestStatus?.business?.shopName || latestStatus?.user?.fullName || 'Vendor';

            // Check if any status in this group is unseen by current user
            const isAllSeen = vendorStatuses.every((st) =>
              Boolean(st.views?.some((v) => v.viewerId === user?.id))
            );

            return (
              <TouchableOpacity
                key={posterUid}
                style={styles.statusItem}
                onPress={() => handleOpenStoryGroup(vendorStatuses, 0)}
              >
                <View style={[styles.statusRing, isAllSeen ? styles.statusRingSeen : styles.statusRingUnseen]}>
                  {latestStatus?.user?.avatar || latestStatus?.mediaUrl ? (
                    <Image source={{ uri: latestStatus.user?.avatar || latestStatus.mediaUrl }} style={styles.statusAvatar} />
                  ) : (
                    <View style={styles.statusAvatarFallback}>
                      <Text style={styles.statusAvatarFallbackText}>
                        {posterName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.statusName} numberOfLines={1}>
                  {posterName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Quick Action Shortcuts */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Main', { screen: 'Categories' })}
          >
            <Text style={styles.quickIcon}>🏷️</Text>
            <Text style={styles.quickTitle}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Main', { screen: 'Store' })}
          >
            <Text style={styles.quickIcon}>🏪</Text>
            <Text style={styles.quickTitle}>My Store Catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Main', { screen: 'Chats' })}
          >
            <Text style={styles.quickIcon}>💬</Text>
            <Text style={styles.quickTitle}>Direct Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('CallHistory')}
          >
            <Text style={styles.quickIcon}>📞</Text>
            <Text style={styles.quickTitle}>Call History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.quickIcon}>⚡</Text>
            <Text style={styles.quickTitle}>Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Products Showcase Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Verified Wholesale Feed</Text>
          <Text style={styles.sectionSubtitle}>SKU Deduplicated Catalog</Text>
        </View>

        {isProductsLoading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading wholesale products...</Text>
          </View>
        ) : productsData?.products?.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description={`No wholesale items listed in ${activeCommunity.toUpperCase()} community yet.`}
            actionTitle="Browse Categories"
            onAction={() => navigation.navigate('Main', { screen: 'Categories' })}
          />
        ) : (
          productsData?.products?.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              onInquire={() => navigation.navigate('ProductDetail', { productId: item.id })}
              onChatSeller={() => {
                if (item.business?.user?.id) {
                  navigation.navigate('ChatDetail', {
                    conversationId: '',
                    recipientId: item.business.user.id,
                    recipientName: item.business.shopName,
                  });
                }
              }}
            />
          ))
        )}
      </ScrollView>

      {/* WhatsApp Fullscreen Story Viewer Modal */}
      <Modal visible={Boolean(activeStoryGroup && currentActiveStory)} animationType="slide" transparent={false} statusBarTranslucent>
        {activeStoryGroup && currentActiveStory && (
          <View style={[
            styles.storyViewerBg,
            !currentActiveStory.mediaUrl && {
              backgroundColor: currentActiveStory.bgColor || '#0f172a'
            }
          ]}>
            {/* Top Bar Header */}
            <View style={styles.storyHeader}>
              {/* Segmented Progress Bar for CURRENT STORY GROUP ONLY */}
              <View style={styles.storyProgressRow}>
                {activeStoryGroup.map((st, i) => (
                  <View
                    key={st.id}
                    style={[
                      styles.storyProgressBar,
                      i === activeStoryIndex
                        ? styles.storyProgressBarActive
                        : i < activeStoryIndex
                        ? styles.storyProgressBarPassed
                        : styles.storyProgressBarUpcoming,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.storyUserRow}>
                <View style={styles.storyHeaderAvatarBox}>
                  {currentActiveStory.user?.avatar ? (
                    <Image
                      source={{ uri: currentActiveStory.user.avatar }}
                      style={styles.storyHeaderAvatarImg}
                    />
                  ) : (
                    <Text style={styles.storyHeaderAvatarText}>
                      {(currentActiveStory.business?.shopName ||
                        currentActiveStory.user?.fullName ||
                        'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.storyShopName}>
                    {currentActiveStory.business?.shopName ||
                      currentActiveStory.user?.fullName}
                  </Text>
                  <Text style={styles.storyMetaText}>
                    {(() => {
                      const d = new Date(currentActiveStory.createdAt);
                      const now = new Date();
                      const isToday = d.toDateString() === now.toDateString();
                      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
                    })()}{' '}
                    • [{(currentActiveStory.categories?.[0] || 'trade').toUpperCase()}]
                  </Text>
                </View>

                {currentActiveStory.userId === user?.id && (
                  <TouchableOpacity
                    style={styles.storyAddNextHeaderBtn}
                    onPress={() => {
                      setActiveStoryGroup(null);
                      navigation.navigate('CreateStatus');
                    }}
                  >
                    <Text style={styles.storyAddNextHeaderText}>+ Add Frame</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.storyCloseBtn} onPress={() => setActiveStoryGroup(null)}>
                  <Text style={styles.storyCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Media / Text Fullscreen Display Area */}
            <View style={styles.storyContentArea}>
              {currentActiveStory.mediaUrl ? (
                <Image
                  source={{ uri: currentActiveStory.mediaUrl }}
                  style={styles.storyMediaImg}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.storyFullTextContainer}>
                  <Text style={styles.storyFullTextContent}>
                    {currentActiveStory.caption}
                  </Text>
                </View>
              )}

              {/* Caption Overlay if Media */}
              {Boolean(
                currentActiveStory.mediaUrl &&
                  currentActiveStory.caption
              ) && (
                <View style={styles.storyCaptionOverlay}>
                  <Text style={styles.storyCaptionText}>
                    {currentActiveStory.caption}
                  </Text>
                </View>
              )}
            </View>

            {/* Tap Navigation Overlays (Left 50%: Prev, Right 50%: Next) */}
            <View style={styles.storyNavRow}>
              <TouchableOpacity
                style={styles.storyNavLeft}
                onPress={() => {
                  if (activeStoryIndex > 0) {
                    const prevIdx = activeStoryIndex - 1;
                    setActiveStoryIndex(prevIdx);
                    setShowViewersSheet(false);
                    if (activeStoryGroup[prevIdx]?.id) {
                      viewStatus(activeStoryGroup[prevIdx].id);
                    }
                  }
                }}
              />
              <TouchableOpacity
                style={styles.storyNavRight}
                onPress={() => {
                  if (activeStoryIndex < activeStoryGroup.length - 1) {
                    const nextIdx = activeStoryIndex + 1;
                    setActiveStoryIndex(nextIdx);
                    setShowViewersSheet(false);
                    if (activeStoryGroup[nextIdx]?.id) {
                      viewStatus(activeStoryGroup[nextIdx].id);
                    }
                  } else {
                    setActiveStoryGroup(null);
                  }
                }}
              />
            </View>

            {/* Bottom Footer View Count: VISIBLE ONLY TO STORY OWNER & SUPER ADMIN */}
            {Boolean(
              currentActiveStory.userId === user?.id ||
                (user as any)?.role === 'SUPER_ADMIN' ||
                user?.email === 'dnpatel2002@gmail.com'
            ) && (() => {
              const isViewersDataCurrent = viewersData?.statusId === currentActiveStory.id;
              const frameViewsCount = isViewersDataCurrent
                ? viewersData.totalViews
                : (currentActiveStory.views?.length ?? currentActiveStory.viewsCount ?? 0);

              return (
                <View style={styles.storyFooter}>
                  <TouchableOpacity
                    style={styles.storyViewsBtn}
                    onPress={() => setShowViewersSheet(true)}
                  >
                    <Text style={styles.storyViewsText}>
                      👁️ {frameViewsCount} Views  ▲
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        )}
      </Modal>

      {/* Status Viewers List Modal */}
      <Modal visible={showViewersSheet} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.viewersModalOverlay}
          activeOpacity={1}
          onPress={() => setShowViewersSheet(false)}
        >
          <View style={styles.viewersSheetContent}>
            {(() => {
              const isViewersDataCurrent = currentActiveStory && viewersData?.statusId === currentActiveStory.id;
              const frameTotalViews = isViewersDataCurrent
                ? viewersData.totalViews
                : (currentActiveStory?.views?.length ?? currentActiveStory?.viewsCount ?? 0);
              const frameViewersList = isViewersDataCurrent ? (viewersData.viewers || []) : [];

              return (
                <>
                  <View style={styles.viewersHeader}>
                    <Text style={styles.viewersTitle}>
                      👁️ Status Viewers ({frameTotalViews})
                    </Text>
                    <TouchableOpacity onPress={() => setShowViewersSheet(false)}>
                      <Text style={styles.viewersCloseText}>✕ Close</Text>
                    </TouchableOpacity>
                  </View>

                  {isLoadingViewers ? (
                    <View style={styles.viewersLoadingBox}>
                      <Text style={styles.viewersLoadingText}>Loading viewer analytics...</Text>
                    </View>
                  ) : frameViewersList.length === 0 ? (
                    <View style={styles.viewersEmptyBox}>
                      <Text style={styles.viewersEmptyText}>No viewers recorded for this frame yet.</Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.viewersListScroll} showsVerticalScrollIndicator={false}>
                      {frameViewersList.map((v) => (
                        <View key={v.viewerId} style={styles.viewerRow}>
                          <View style={styles.viewerAvatar}>
                            <Text style={styles.viewerAvatarText}>
                              {v.fullName ? v.fullName.charAt(0).toUpperCase() : 'U'}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.viewerNameText}>{v.fullName}</Text>
                            <Text style={styles.viewerShopText}>🏢 {v.shopName || 'Verified Vendor'}</Text>
                            <Text style={styles.viewerTimeText}>
                              {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.viewerChatBtn}
                            onPress={() => {
                              setShowViewersSheet(false);
                              setActiveStoryGroup(null);
                              navigation.navigate('ChatDetail', {
                                conversationId: '',
                                recipientId: v.viewerId,
                                recipientName: v.shopName || v.fullName,
                              });
                            }}
                          >
                            <Text style={styles.viewerChatText}>💬 Direct Chat</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
  },
  communityBar: { marginBottom: 16 },
  communityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 8,
  },
  communityPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  communityText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  communityTextActive: { color: '#ffffff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: '#64748b', fontSize: 11 },
  sectionAction: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
  statusesBar: { marginBottom: 20 },
  addStatusCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addStatusPlus: { color: '#818cf8', fontSize: 20, fontWeight: '900' },
  addStatusLabel: { color: '#94a3b8', fontSize: 9, marginTop: 2 },
  statusItem: { alignItems: 'center', marginRight: 14, width: 64 },
  statusRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    padding: 2,
  },
  statusRingUnseen: {
    borderColor: '#10b981', // Bright WhatsApp Green
  },
  statusRingSeen: {
    borderColor: '#64748b', // Muted Grey
  },
  statusRingAdd: {
    borderColor: '#3b82f6',
  },
  statusAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAvatarFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  addStatusBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#020617',
  },
  addStatusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: -1,
  },
  statusAvatar: { width: '100%', height: '100%', borderRadius: 27 },
  statusName: { color: '#cbd5e1', fontSize: 10, marginTop: 4, textAlign: 'center' },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  storyProgressBarActive: {
    backgroundColor: '#10b981',
  },
  storyProgressBarPassed: {
    backgroundColor: '#10b981',
  },
  storyProgressBarUpcoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    alignItems: 'center',
  },
  quickIcon: { fontSize: 22, marginBottom: 4 },
  quickTitle: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  loadingBox: { padding: 30, alignItems: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 14 },

  /* WhatsApp Fullscreen Story Viewer Modal Styles */
  storyViewerBg: {
    flex: 1,
    backgroundColor: '#0b141a', // 100% Solid WhatsApp Dark Background
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 20,
  },
  storyHeader: {
    paddingHorizontal: 16,
    zIndex: 10,
  },
  storyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  storyHeaderAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#818cf8',
    overflow: 'hidden',
  },
  storyHeaderAvatarImg: {
    width: '100%',
    height: '100%',
  },
  storyHeaderAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  storyShopName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  storyMetaText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  storyAddNextHeaderBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  storyAddNextHeaderText: {
    color: '#020617',
    fontSize: 11,
    fontWeight: '900',
  },
  storyCloseBtn: {
    padding: 8,
  },
  storyCloseText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  storyContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  storyMediaImg: {
    width: '100%',
    height: '100%',
  },
  storyFullTextContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  storyFullTextContent: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  storyCaptionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.overlay,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  storyCaptionText: {
    color: colors.textMain,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyNavRow: {
    position: 'absolute',
    top: 80,
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  storyNavLeft: {
    flex: 1,
  },
  storyNavRight: {
    flex: 1,
  },
  storyFooter: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  storyViewsBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  storyViewsText: {
    color: colors.textMain,
    fontSize: 13,
    fontWeight: '800',
  },
  storyPublicBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },

  /* Viewers List Modal Styles */
  viewersModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  viewersSheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewersTitle: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: '900',
  },
  viewersCloseText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  viewersLoadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  viewersLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  viewersEmptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  viewersEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  viewersListScroll: {
    maxHeight: 350,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewerAvatarText: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: '800',
  },
  viewerNameText: {
    color: colors.textMain,
    fontSize: 14,
    fontWeight: '800',
  },
  viewerShopText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  viewerTimeText: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 2,
  },
  viewerChatBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  viewerChatText: {
    color: colors.textMain,
    fontSize: 11,
    fontWeight: '900',
  },
});

