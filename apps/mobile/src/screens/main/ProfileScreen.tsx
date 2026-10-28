import React, { useState } from 'react';
import {
  View,
  Text,
  useWindowDimensions,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ClothingProductCreateModal } from '../../components/ClothingProductCreateModal';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';
import { useGetMyStoreQuery } from '../../store/api/storeApi';
import {
  useUpdateProfileMutation as useUpdateUserProfileMutation,
  useGetProfileQuery,
  useRequestAccountDeletionMutation,
} from '../../services/api/authApi';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Profile'>;

const { width } = Dimensions.get('window');
const GRID_COLUMN_WIDTH = (width - 48) / 3; // 3-column layout grid

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { width: windowWidth } = useWindowDimensions();
  const [catalogContainerWidth, setCatalogContainerWidth] = useState<number>(0);

  // Responsive 3-column width calculation:
  // Total horizontal padding is 64px (32px on scrollContent + 32px on sectionCard).
  // Two 8px gaps between 3 columns = 16px.
  const containerWidth = catalogContainerWidth > 0 ? catalogContainerWidth : (windowWidth - 64);
  const responsiveCardWidth = Math.max(88, Math.floor((containerWidth - 16) / 3));
  const { user: authUser } = useAppSelector((state) => state.auth);

  // Profile and Store queries with refetch capabilities
  const { data: profileData, refetch: refetchProfile } = useGetProfileQuery();
  const { data: storeData, isLoading: isStoreLoading, refetch: refetchStore } = useGetMyStoreQuery();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const [requestAccountDeletion] = useRequestAccountDeletionMutation();

  const user = profileData?.user || authUser;

  // Refresh Control state
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editShopName, setEditShopName] = useState(user?.business?.shopName || '');
  const [editStreetAddress, setEditStreetAddress] = useState(user?.business?.streetAddress || '');
  const [editCity, setEditCity] = useState(user?.business?.city || '');
  const [editState, setEditState] = useState(user?.business?.state || '');
  const [editPincode, setEditPincode] = useState(user?.business?.pincode || '');
  const [editGstNumber, setEditGstNumber] = useState(
    user?.business?.gstNumber && user?.business?.gstNumber !== 'N/A' ? user.business.gstNumber : ''
  );
  const [editBio, setEditBio] = useState('');
  const [editTradeTerms, setEditTradeTerms] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Universal Dynamic Product Create Modal (Identical to Store)
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStore(), refetchProfile()]);
    } catch (err) {
      console.log('Profile pull-to-refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenEditProfile = () => {
    setEditFullName(user?.fullName || '');
    setEditShopName(user?.business?.shopName || '');
    setEditStreetAddress(user?.business?.streetAddress || '');
    setEditCity(user?.business?.city || '');
    setEditState(user?.business?.state || '');
    setEditPincode(user?.business?.pincode || '');
    setEditGstNumber(
      user?.business?.gstNumber && user?.business?.gstNumber !== 'N/A' ? user.business.gstNumber : ''
    );
    setEditBio(storeData?.store?.bio || '');
    setEditTradeTerms((user?.business as any)?.tradeTerms || '');
    setEditProfileModal(true);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => authService.logoutUser(dispatch),
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim() || !editShopName.trim()) {
      Alert.alert('Required Fields', 'Owner name and Shop name cannot be empty.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        fullName: editFullName.trim(),
        shopName: editShopName.trim(),
        streetAddress: editStreetAddress.trim(),
        city: editCity.trim(),
        state: editState.trim(),
        pincode: editPincode.trim(),
        gstNumber: editGstNumber.trim() || undefined,
        tradeTerms: editTradeTerms.trim() || undefined,
      } as any).unwrap();
      setIsSavingProfile(false);
      setEditProfileModal(false);
      await Promise.all([refetchStore(), refetchProfile()]);
      Alert.alert('Success', 'Business profile credentials updated!');
    } catch (err: any) {
      setIsSavingProfile(false);
      Alert.alert('Update Failed', err?.data?.error || 'Unable to update profile.');
    }
  };

  const handleAccountDeletionRequest = async () => {
    if (!deletionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a brief reason for requesting account deletion.');
      return;
    }

    setIsSubmittingDelete(true);
    try {
      await requestAccountDeletion({ reason: deletionReason.trim() }).unwrap();
      setIsSubmittingDelete(false);
      setDeleteModalVisible(false);
      setDeletionReason('');
      await refetchProfile();
      Alert.alert(
        '✅ Deletion Request Submitted',
        'Your account deletion request has been submitted to Super Admin for compliance approval as per Apple & Google compliance policies.'
      );
    } catch (err: any) {
      setIsSubmittingDelete(false);
      Alert.alert('Error', err?.data?.error || err?.message || 'Failed to submit account deletion request.');
    }
  };

  const biz = user?.business;
  const store = storeData?.store;

  const rawCommunities: any = biz?.allowedCommunities || (user as any)?.allowedCommunities || [];
  const allowedCommList: string[] = (
    Array.isArray(rawCommunities)
      ? rawCommunities
      : typeof rawCommunities === 'string'
      ? rawCommunities.split(',')
      : []
  )
    .map((c: any) => (typeof c === 'string' ? c.trim() : (c?.name || c?.slug || '').trim()))
    .filter((c: string) => c.length > 0 && /[a-z0-9]/i.test(c));
  const displayCommList = allowedCommList.length > 0 ? allowedCommList : ['Wholesale Trade'];

  const rawShopMedia = (biz as any)?.media || (storeData as any)?.store?.media || (biz as any)?.photos || [];
  const shopMediaItems: any[] = Array.isArray(rawShopMedia)
    ? rawShopMedia.filter((m: any) => Boolean(typeof m === 'string' ? m : m?.url))
    : [];
  const hasShopMedia = shopMediaItems.length > 0;

  // Extract products from both storeData.products (primary API response) and store.products
  const myProducts: any[] = (storeData as any)?.products || store?.products || [];

  const handleNavigateToStore = () => {
    navigation.navigate('Main', { screen: 'Store' } as any);
  };

  return (
    <View style={styles.container}>
      <Header
        title="My Business Profile"
        subtitle="Nexus Enterprise Showcase & Catalog"
        rightElement={
          <TouchableOpacity style={styles.logoutPill} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#818cf8"
            colors={['#818cf8', '#4f46e5']}
          />
        }
      >
        {/* 1. Profile Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlowCircle} />

          {/* Avatar with Glowing Gradient Badge */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlowRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarInitial}>
                  {user?.fullName?.charAt(0).toUpperCase() || 'B'}
                </Text>
              </View>
            </View>
            <View style={styles.verifiedBadgeCircle}>
              <Text style={styles.verifiedCheckIcon}>✓</Text>
            </View>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustPill}>
            <Text style={styles.trustPillIcon}>🛡️</Text>
            <Text style={styles.trustPillText}>
              {user?.isVerified ? 'KYC & GST Verified • Tier 1 Partner' : '⏳ Verification Pending'}
            </Text>
          </View>

          {/* Names */}
          <Text style={styles.heroOwnerName}>{user?.fullName || 'Business Owner'}</Text>
          <Text style={styles.heroShopName}>{biz?.shopName || 'Wholesale Business Store'}</Text>

          {/* Responsive Allowed Communities Badges & Clean Location */}
          <View style={styles.communitiesWrapper}>
            {displayCommList.map((comm: string, idx: number) => {
              const clean = comm.charAt(0).toUpperCase() + comm.slice(1);
              return (
                <View key={idx} style={styles.communityChip}>
                  <Text style={styles.communityChipText}>🏷️ {clean}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>
              📍 {biz?.city ? (biz.city + (biz.state ? ', ' + biz.state : '')) : 'Location Not Specified'}
            </Text>
          </View>

          {/* Bio Description */}
          <Text style={styles.heroBioText}>
            {store?.bio || (biz as any)?.bio || 'Verified wholesale business store profile.'}
          </Text>

          {/* Hero CTAs */}
          <View style={styles.heroCtaRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenEditProfile}>
              <Text style={styles.primaryBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                Alert.alert('Store QR Code', 'Store QR Code for ' + (biz?.shopName || 'My Business'))
              }
            >
              <Text style={styles.iconBtnText}>📱</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtnWhatsApp}
              onPress={() => Linking.openURL('https://wa.me/91' + (user?.mobileNumber || ''))}
            >
              <Text style={styles.iconBtnText}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Business Credentials Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleBox}>
              <Text style={styles.cardHeaderIcon}>🏷️</Text>
              <Text style={styles.cardHeaderTitle}>Business Credentials</Text>
            </View>
            <TouchableOpacity onPress={handleOpenEditProfile}>
              <Text style={styles.editLinkText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.credList}>
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>👤 Legal Owner Name</Text>
              <Text style={styles.credVal}>{user?.fullName || 'N/A'}</Text>
            </View>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>🏢 Entity / Shop Name</Text>
              <Text style={styles.credVal}>{biz?.shopName || 'N/A'}</Text>
            </View>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>📞 WhatsApp / Mobile</Text>
              <Text style={styles.credValHighlight}>+91 {user?.mobileNumber || 'N/A'}</Text>
            </View>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>✉️ Work Email</Text>
              <Text style={styles.credValHighlight}>{user?.email || 'N/A'}</Text>
            </View>

            <View style={styles.credRowCol}>
              <Text style={styles.credLabel}>🏭 Mill & Dispatch Address</Text>
              <Text style={styles.credValSub}>
                {biz?.streetAddress
                  ? (biz.streetAddress + ', ' + (biz.city || '') + ', ' + (biz.state || '') + (biz.pincode ? ' - ' + biz.pincode : ''))
                  : 'Location Address Not Specified'}
              </Text>
            </View>

            {/* Tax Registrations Card */}
            <View style={styles.taxBox}>
              <View style={styles.taxBoxHeader}>
                <Text style={styles.taxBoxTitle}>TAX REGISTRATIONS & GSTIN</Text>
                <Text style={styles.taxBoxCheck}>✓ {biz?.gstNumber ? 'Verified' : 'Optional'}</Text>
              </View>
              <View style={styles.taxPillRow}>
                <View style={styles.taxPill}>
                  <Text style={styles.taxPillText}>
                    GSTIN:{' '}
                    <Text style={styles.taxPillCode}>
                      {biz?.gstNumber && biz.gstNumber !== 'N/A' ? biz.gstNumber : 'Not Filed'}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Trade Terms Card */}
            <View style={styles.termsBox}>
              <Text style={styles.termsTitle}>WHOLESALE TRADE TERMS</Text>
              <Text style={styles.termsText}>
                {(biz as any)?.tradeTerms || 'Standard Wholesale Terms'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. My Product Catalog (3-Column Grid) */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <TouchableOpacity
              style={styles.cardHeaderTitleBox}
              activeOpacity={0.7}
              onPress={handleNavigateToStore}
            >
              <Text style={styles.cardHeaderTitle}>My Catalog</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myProducts.length}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.catalogHeaderActions}>
              <TouchableOpacity
                style={styles.viewStoreLink}
                onPress={handleNavigateToStore}
                activeOpacity={0.7}
              >
                <Text style={styles.viewStoreLinkText}>View Store ➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtnSmall}
                onPress={() => setAddProductModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnSmallText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isStoreLoading ? (
            <Text style={styles.loadingText}>Loading products catalog...</Text>
          ) : myProducts.length === 0 ? (
            <View style={styles.emptyCatalogBox}>
              <Text style={styles.emptyCatalogIcon}>📦</Text>
              <Text style={styles.emptyCatalogTitle}>No Products in Catalog</Text>
              <Text style={styles.emptyCatalogSub}>
                Add your products to display in the 3-column wholesale store.
              </Text>
              <Button
                title="+ Add First Product"
                onPress={() => setAddProductModalOpen(true)}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <View>
              <View
                style={styles.gridContainer}
                onLayout={(e) => {
                  const w = Math.floor(e.nativeEvent.layout.width);
                  if (w > 0 && w !== catalogContainerWidth) {
                    setCatalogContainerWidth(w);
                  }
                }}
              >
                {myProducts.slice(0, 6).map((prod: any, index: number) => {
                  const isHot = Boolean(prod.isHotSelling);
                  const badgeLabel = isHot ? '🔥 Hot' : (prod.code ? prod.code.replace(/^SKU-/, '') : 'SKU');
                  const badgeColor = isHot ? '#f59e0b' : '#6366f1';
                  const priceVal = prod.priceTiers?.[0]?.price || prod.price || 150;
                  const imgUrl =
                    (Array.isArray(prod.images) && prod.images[0]) ||
                    prod.image ||
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&q=80';

                  return (
                    <TouchableOpacity
                      key={prod.id || index}
                      style={[styles.gridCard, { width: responsiveCardWidth }]}
                      activeOpacity={0.8}
                      onPress={handleNavigateToStore}
                    >
                      <View style={[styles.gridImageWrapper, { height: responsiveCardWidth }]}>
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.gridImage}
                          resizeMode="cover"
                        />
                        <View style={[styles.gridBadgeOverlay, { backgroundColor: badgeColor }]}>
                          <Text style={styles.gridBadgeText} numberOfLines={1}>
                            {badgeLabel}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.gridCardMeta}>
                        <Text style={styles.gridTitle} numberOfLines={1}>
                          {prod.title}
                        </Text>
                        <Text style={styles.gridSub} numberOfLines={1}>
                          MOQ {prod.moq || 1} units
                        </Text>
                        <Text style={styles.gridPrice} numberOfLines={1}>
                          ₹{priceVal.toLocaleString('en-IN')}{' '}
                          <Text style={styles.gridUnit}>/unit</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* View Full Store Redirect Banner */}
              <TouchableOpacity
                style={styles.openFullStoreBanner}
                activeOpacity={0.8}
                onPress={handleNavigateToStore}
              >
                <Text style={styles.openFullStoreText}>
                  🏪 View All {myProducts.length} Products in Store Catalog ➔
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 4. Verified Shop Photos Media Gallery (Hidden if no photos/videos uploaded) */}
        {hasShopMedia && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleText}>🖼️ Verified Shop Photos & Gallery</Text>
            <Text style={styles.sectionSubText}>Photos verified during onboarding inspection</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {shopMediaItems.map((m: any, idx: number) => {
                const mediaUrl = typeof m === 'string' ? m : m.url;
                const isVideo =
                  (typeof m === 'object' && (m.type === 'video' || m.isVideo)) ||
                  mediaUrl.toLowerCase().endsWith('.mp4') ||
                  mediaUrl.toLowerCase().endsWith('.mov') ||
                  mediaUrl.toLowerCase().endsWith('.webm');

                return (
                  <View key={m.id || idx} style={styles.mediaThumbWrapper}>
                    <Image
                      source={{ uri: mediaUrl }}
                      style={styles.mediaThumbImage}
                      resizeMode="cover"
                    />
                    {isVideo && (
                      <View style={styles.videoBadgeOverlay}>
                        <Text style={styles.videoBadgeText}>▶ Video</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 5. Account & Legal Settings Controls */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleText}>⚙️ Business Account & Legal Controls</Text>

          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.menuIconText}>⚡</Text>
            <View style={styles.menuMetaBox}>
              <Text style={styles.menuTitleText}>Subscription & Enterprise Billing</Text>
              <Text style={styles.menuSubText}>Manage payment cycles & UPI transaction proofs</Text>
            </View>
            <Text style={styles.menuArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('CallHistory')}
          >
            <Text style={styles.menuIconText}>📋</Text>
            <View style={styles.menuMetaBox}>
              <Text style={styles.menuTitleText}>Call Logs & History</Text>
              <Text style={styles.menuSubText}>View incoming, outgoing, and missed call history</Text>
            </View>
            <Text style={styles.menuArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              user?.mobileNumber
                ? Linking.openURL('tel:' + user.mobileNumber)
                : Alert.alert('Support Line', 'No support number registered.')
            }
          >
            <Text style={styles.menuIconText}>📞</Text>
            <View style={styles.menuMetaBox}>
              <Text style={styles.menuTitleText}>Direct Call Support Line</Text>
              <Text style={styles.menuSubText}>Connect with verified account manager</Text>
            </View>
            <Text style={styles.menuArrow}>➔</Text>
          </TouchableOpacity>

          {user?.isDeletionRequested ? (
            <View style={styles.deletionPendingBanner}>
              <Text style={styles.deletionPendingIcon}>⚠️</Text>
              <View style={styles.menuMetaBox}>
                <Text style={styles.deletionPendingTitle}>Account Deletion Pending Review</Text>
                <Text style={styles.menuSubText}>
                  Reason: "{user?.deletionReason || 'Submitted by user'}" • Awaiting Super Admin review
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.menuRow} onPress={() => setDeleteModalVisible(true)}>
              <Text style={styles.menuIconText}>🗑️</Text>
              <View style={styles.menuMetaBox}>
                <Text style={styles.menuDangerText}>Request Account Deletion</Text>
                <Text style={styles.menuSubText}>Compliance policy for Play Store & App Store</Text>
              </View>
              <Text style={styles.menuArrow}>➔</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal 1: Edit Profile */}
      <Modal visible={editProfileModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitleBlue}>✏️ Edit Business Credentials</Text>
              <Input
                label="Legal Owner Name *"
                placeholder="e.g. Dipen Patel"
                value={editFullName}
                onChangeText={setEditFullName}
              />
              <Input
                label="Shop / Business Name *"
                placeholder="e.g. Royal Textiles"
                value={editShopName}
                onChangeText={setEditShopName}
              />
              <Input
                label="Street Address"
                placeholder="e.g. GIDC Ring Road Market"
                value={editStreetAddress}
                onChangeText={setEditStreetAddress}
              />

              <View style={styles.inputRowDouble}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="City"
                    placeholder="e.g. Surat"
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="State"
                    placeholder="e.g. Gujarat"
                    value={editState}
                    onChangeText={setEditState}
                  />
                </View>
              </View>

              <Input
                label="Pincode"
                placeholder="e.g. 395002"
                keyboardType="numeric"
                value={editPincode}
                onChangeText={setEditPincode}
              />
              <Input
                label="GST Number (Leave blank if not filed)"
                placeholder="e.g. 24AAAAA0000A1Z5"
                value={editGstNumber}
                onChangeText={setEditGstNumber}
              />
              <Input
                label="Wholesale Trade Terms / Policy"
                placeholder="e.g. Min Order ₹50,000 • 20% Advance"
                value={editTradeTerms}
                onChangeText={setEditTradeTerms}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditProfileModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Credentials"
                  loading={isSavingProfile}
                  onPress={handleSaveProfile}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal 2: Universal Dynamic B2B Product Creation Modal (Identical to Store) */}
      <ClothingProductCreateModal
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={() => {
          refetchStore();
          refetchProfile();
        }}
      />

      {/* Modal 3: Account Deletion Request */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleDanger}>⚠️ Request Account Deletion</Text>
            <Text style={styles.modalSub}>
              Submitting an account deletion request will remove your business catalog and store
              profile upon Super Admin approval.
            </Text>

            <Input
              label="Reason for Deletion *"
              placeholder="e.g. Closing business or creating new account..."
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Request"
                variant="danger"
                loading={isSubmittingDelete}
                onPress={handleAccountDeletionRequest}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },
  logoutPill: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  // Hero Card
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    backgroundColor: '#6366f1',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#818cf8',
    fontSize: 36,
    fontWeight: '900',
  },
  verifiedBadgeCircle: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00a572',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  verifiedCheckIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  trustPillIcon: { fontSize: 12, marginRight: 6 },
  trustPillText: { color: '#4edea3', fontSize: 11, fontWeight: '800' },
  heroOwnerName: { color: '#ffffff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroShopName: { color: '#818cf8', fontSize: 14, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  // Responsive communities & location
  communitiesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  communityChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  communityChipText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '700',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  locationPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaThumbWrapper: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoBadgeOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  deletionPendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    marginTop: 4,
  },
  deletionPendingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  deletionPendingTitle: {
    color: '#fb7185',
    fontSize: 13,
    fontWeight: '800',
  },
  metaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  metaDot: { color: '#475569', fontSize: 12 },
  heroBioText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' },
  primaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnWhatsApp: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00a572',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18 },

  // Section Cards
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderIcon: { fontSize: 18 },
  cardHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  editLinkText: { color: '#818cf8', fontSize: 12, fontWeight: '800' },

  // Credentials List
  credList: { gap: 10 },
  credRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  credRowCol: { gap: 4, marginTop: 4 },
  credLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  credVal: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  credValHighlight: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
  credValSub: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },

  taxBox: {
    backgroundColor: '#151b2d',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  taxBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taxBoxTitle: { color: '#4edea3', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  taxBoxCheck: { color: '#4edea3', fontSize: 10, fontWeight: '900' },
  taxPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  taxPill: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  taxPillText: { color: '#cbd5e1', fontSize: 10, fontWeight: '700' },
  taxPillCode: { color: '#c0c1ff', fontWeight: '900' },

  termsBox: {
    backgroundColor: '#191f31',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  termsTitle: { color: '#ffb95f', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  termsText: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  boldWhite: { color: '#ffffff', fontWeight: '800' },

  // Catalog Section
  catalogHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countBadgeText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  viewStoreLink: { paddingHorizontal: 4, paddingVertical: 2 },
  viewStoreLinkText: { color: '#818cf8', fontSize: 11, fontWeight: '700' },
  addBtnSmall: { backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addBtnSmallText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  loadingText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginVertical: 16 },
  emptyCatalogBox: { alignItems: 'center', paddingVertical: 20 },
  emptyCatalogIcon: { fontSize: 32, marginBottom: 8 },
  emptyCatalogTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  emptyCatalogSub: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard: {
    backgroundColor: '#151b2d',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 6,
  },
  gridImageWrapper: { width: '100%', height: GRID_COLUMN_WIDTH, backgroundColor: '#0f172a', position: 'relative' },
  gridImage: { width: '100%', height: '100%' },
  gridBadgeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridBadgeText: { color: '#ffffff', fontSize: 8, fontWeight: '900' },
  gridCardMeta: { padding: 6 },
  gridTitle: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  gridSub: { color: '#64748b', fontSize: 9, marginTop: 2 },
  gridPrice: { color: '#818cf8', fontSize: 11, fontWeight: '900', marginTop: 4 },
  gridUnit: { color: '#64748b', fontSize: 8, fontWeight: '400' },

  openFullStoreBanner: {
    marginTop: 12,
    backgroundColor: '#151b2d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  openFullStoreText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },

  // Media Gallery
  sectionTitleText: { color: '#818cf8', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  sectionSubText: { color: '#64748b', fontSize: 11, marginBottom: 10 },
  mediaRow: { flexDirection: 'row' },
  mediaThumbImage: { width: 120, height: 90, borderRadius: 10, backgroundColor: '#1e293b', marginRight: 10 },

  // Settings Menu
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuIconText: { fontSize: 20, marginRight: 12 },
  menuMetaBox: { flex: 1 },
  menuTitleText: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  menuDangerText: { color: '#fb7185', fontSize: 13, fontWeight: '700' },
  menuSubText: { color: '#64748b', fontSize: 10, marginTop: 2 },
  menuArrow: { color: '#64748b', fontSize: 13 },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitleBlue: { color: '#818cf8', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  modalTitleDanger: { color: '#fb7185', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  inputRowDouble: { flexDirection: 'row', gap: 10 },
});
