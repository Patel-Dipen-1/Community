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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { ProductCard } from '../../components/common/ProductCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useGetStatusesQuery } from '../../store/api/statusApi';
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
          <TouchableOpacity
            style={styles.addStatusCircle}
            onPress={() => navigation.navigate('CreateStatus')}
          >
            <Text style={styles.addStatusPlus}>+</Text>
            <Text style={styles.addStatusLabel}>My Update</Text>
          </TouchableOpacity>

          {statusesData?.statuses?.map((st) => (
            <View key={st.id} style={styles.statusItem}>
              <View style={styles.statusRing}>
                <Image
                  source={{ uri: st.user?.avatar || st.mediaUrl || 'https://via.placeholder.com/80' }}
                  style={styles.statusAvatar}
                />
              </View>
              <Text style={styles.statusName} numberOfLines={1}>
                {st.business?.shopName || st.user?.fullName}
              </Text>
            </View>
          ))}
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
    borderWidth: 2,
    borderColor: '#10b981',
    padding: 2,
  },
  statusAvatar: { width: '100%', height: '100%', borderRadius: 27 },
  statusName: { color: '#cbd5e1', fontSize: 10, marginTop: 4, textAlign: 'center' },
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
});
