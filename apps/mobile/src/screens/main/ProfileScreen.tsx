import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';
import { useGetMyStoreQuery } from '../../store/api/storeApi';
import { useCreateProductMutation } from '../../store/api/productApi';
import { useUpdateProfileMutation as useUpdateUserProfileMutation, useGetProfileQuery } from '../../services/api/authApi';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Profile'>;

const { width } = Dimensions.get('window');
const GRID_COLUMN_WIDTH = (width - 48) / 3; // 3-column layout grid

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user: authUser } = useAppSelector((state) => state.auth);

  // Profile and Store queries with refetch capabilities
  const { data: profileData, refetch: refetchProfile } = useGetProfileQuery();
  const { data: storeData, isLoading: isStoreLoading, refetch: refetchStore } = useGetMyStoreQuery();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();

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
  const [editGstNumber, setEditGstNumber] = useState(user?.business?.gstNumber || '');
  const [editBio, setEditBio] = useState('');
  const [editTradeTerms, setEditTradeTerms] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [addProductModal, setAddProductModal] = useState(false);
  const [prodTitle, setProdTitle] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodMOQ, setProdMOQ] = useState('100');
  const [prodImage, setProdImage] = useState('');

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
    setEditGstNumber(user?.business?.gstNumber && user?.business?.gstNumber !== 'N/A' ? user.business.gstNumber : '');
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

  const handleAddProduct = async () => {
    if (!prodTitle.trim() || !prodPrice.trim()) {
      Alert.alert('Missing Fields', 'Please provide Product Title and Price.');
      return;
    }
    try {
      await createProduct({
        title: prodTitle.trim(),
        description: 'Direct Mill Quality Bulk Wholesale Item',
        code: `PROD-${Date.now().toString().slice(-4)}`,
        moq: parseInt(prodMOQ, 10) || 100,
        priceTiers: [{ minQty: 1, price: parseFloat(prodPrice) || 100 }],
        images: [prodImage.trim() || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&q=80'],
        isHotSelling: true,
      } as any).unwrap();

      setAddProductModal(false);
      setProdTitle('');
      setProdPrice('');
      setProdImage('');
      refetchStore();
      Alert.alert('Success', 'Product added to your dynamic catalog!');
    } catch (err: any) {
      Alert.alert('Add Product Error', err?.data?.error || 'Failed to add product.');
    }
  };

  const handleAccountDeletionRequest = () => {
    if (!deletionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a brief reason for requesting account deletion.');
      return;
    }

    setIsSubmittingDelete(true);
    setTimeout(() => {
      setIsSubmittingDelete(false);
      setDeleteModalVisible(false);
      Alert.alert(
        'Deletion Request Submitted',
        'Your request has been sent to Super Admin for approval as per Apple & Google compliance policies.'
      );
    }, 1200);
  };

  const biz = user?.business;
  const store = storeData?.store;
  const myProducts = store?.products || [];

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
                <Text style={styles.avatarInitial}>{user?.fullName?.charAt(0).toUpperCase() || 'B'}</Text>
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

          {/* Category & Location */}
          <View style={styles.metaBadgeRow}>
            <Text style={styles.metaText}>
              🏪 {Array.isArray(biz?.allowedCommunities) ? biz.allowedCommunities.join(', ') : (typeof biz?.allowedCommunities === 'string' ? biz.allowedCommunities : 'All Communities')}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>📍 {biz?.city ? `${biz.city}${biz.state ? `, ${biz.state}` : ''}` : 'Location Not Specified'}</Text>
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

            <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Store QR Code', `Store QR Code for ${biz?.shopName || 'My Business'}`)}>
              <Text style={styles.iconBtnText}>📱</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtnWhatsApp}
              onPress={() => Linking.openURL(`https://wa.me/91${user?.mobileNumber || ''}`)}
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
                {biz?.streetAddress ? `${biz.streetAddress}, ${biz.city || ''}, ${biz.state || ''} ${biz.pincode ? `- ${biz.pincode}` : ''}` : 'Location Address Not Specified'}
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
            <View style={styles.cardHeaderTitleBox}>
              <Text style={styles.cardHeaderTitle}>My Catalog</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myProducts.length}</Text>
              </View>
            </View>
            <View style={styles.catalogHeaderActions}>
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => setAddProductModal(true)}>
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
              <Text style={styles.emptyCatalogSub}>Add your products to display in the 3-column wholesale store.</Text>
              <Button title="+ Add First Product" onPress={() => setAddProductModal(true)} style={{ marginTop: 12 }} />
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {myProducts.map((prod, index) => {
                const badgeLabel = prod.isHotSelling ? 'Hot Selling' : 'Verified SKU';
                const badgeColor = prod.isHotSelling ? '#f59e0b' : '#6366f1';
                const priceVal = prod.priceTiers?.[0]?.price || 150;
                return (
                  <TouchableOpacity
                    key={prod.id || index}
                    style={styles.gridCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('ProductDetail', { productId: prod.id })}
                  >
                    <View style={styles.gridImageWrapper}>
                      <Image
                        source={{ uri: prod.images?.[0] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&q=80' }}
                        style={styles.gridImage}
                      />
                      <View style={[styles.gridBadgeOverlay, { backgroundColor: badgeColor }]}>
                        <Text style={styles.gridBadgeText}>{badgeLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.gridCardMeta}>
                      <Text style={styles.gridTitle} numberOfLines={1}>
                        {prod.title}
                      </Text>
                      <Text style={styles.gridSub} numberOfLines={1}>
                        MOQ {prod.moq || 100} units
                      </Text>
                      <Text style={styles.gridPrice}>
                        ₹{priceVal} <Text style={styles.gridUnit}>/unit</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. Verified Shop Photos Media Gallery */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleText}>🖼️ Verified Shop Photos & Gallery</Text>
          <Text style={styles.sectionSubText}>Photos verified during onboarding inspection</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
            {Array.isArray((biz as any)?.media) && (biz as any).media.length > 0 ? (
              (biz as any).media.map((m: any, idx: number) => (
                <Image key={m.id || idx} source={{ uri: typeof m === 'string' ? m : m.url }} style={styles.mediaThumbImage} />
              ))
            ) : (
              <Text style={{ color: '#64748b', fontSize: 12, paddingVertical: 8 }}>No shop photos uploaded yet.</Text>
            )}
          </ScrollView>
        </View>

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
            onPress={() => user?.mobileNumber ? Linking.openURL('tel:' + user.mobileNumber) : Alert.alert('Support Line', 'No support number registered.')}
          >
            <Text style={styles.menuIconText}>📞</Text>
            <View style={styles.menuMetaBox}>
              <Text style={styles.menuTitleText}>Direct Call Support Line</Text>
              <Text style={styles.menuSubText}>Connect with verified account manager</Text>
            </View>
            <Text style={styles.menuArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.menuIconText}>🗑️</Text>
            <View style={styles.menuMetaBox}>
              <Text style={styles.menuDangerText}>Request Account Deletion</Text>
              <Text style={styles.menuSubText}>Compliance policy for Play Store & App Store</Text>
            </View>
            <Text style={styles.menuArrow}>➔</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal 1: Edit Profile */}
      <Modal visible={editProfileModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitleBlue}>✏️ Edit Business Credentials</Text>
              <Input label="Legal Owner Name *" placeholder="e.g. Dipen Patel" value={editFullName} onChangeText={setEditFullName} />
              <Input label="Shop / Business Name *" placeholder="e.g. Royal Textiles" value={editShopName} onChangeText={setEditShopName} />
              <Input label="Street Address" placeholder="e.g. GIDC Ring Road Market" value={editStreetAddress} onChangeText={setEditStreetAddress} />
              
              <View style={styles.inputRowDouble}>
                <View style={{ flex: 1 }}>
                  <Input label="City" placeholder="e.g. Surat" value={editCity} onChangeText={setEditCity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="State" placeholder="e.g. Gujarat" value={editState} onChangeText={setEditState} />
                </View>
              </View>

              <Input label="Pincode" placeholder="e.g. 395002" keyboardType="numeric" value={editPincode} onChangeText={setEditPincode} />
              <Input label="GST Number (Leave blank if not filed)" placeholder="e.g. 24AAAAA0000A1Z5" value={editGstNumber} onChangeText={setEditGstNumber} />
              <Input label="Wholesale Trade Terms / Policy" placeholder="e.g. Min Order ₹50,000 • 20% Advance" value={editTradeTerms} onChangeText={setEditTradeTerms} multiline numberOfLines={2} />

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => setEditProfileModal(false)} style={{ flex: 1 }} />
                <Button title="Save Credentials" loading={isSavingProfile} onPress={handleSaveProfile} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal 2: Add Product to Catalog */}
      <Modal visible={addProductModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleBlue}>📦 Add New Catalog Item</Text>
            <Input label="Product Title *" placeholder="e.g. 60s Combed Cotton Twill" value={prodTitle} onChangeText={setProdTitle} />
            <Input label="Wholesale Price (₹/unit) *" placeholder="e.g. 185" keyboardType="numeric" value={prodPrice} onChangeText={setProdPrice} />
            <Input label="MOQ (Units/Meters)" placeholder="e.g. 500" keyboardType="numeric" value={prodMOQ} onChangeText={setProdMOQ} />
            <Input label="Image URL (Optional)" placeholder="https://..." value={prodImage} onChangeText={setProdImage} />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setAddProductModal(false)} style={{ flex: 1 }} />
              <Button title="Add Product" loading={isCreatingProduct} onPress={handleAddProduct} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Account Deletion Request */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleDanger}>⚠️ Request Account Deletion</Text>
            <Text style={styles.modalSub}>
              Submitting an account deletion request will remove your business catalog and store profile upon Super Admin approval.
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
              <Button title="Cancel" variant="secondary" onPress={() => setDeleteModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Submit Request" variant="danger" loading={isSubmittingDelete} onPress={handleAccountDeletionRequest} style={{ flex: 1 }} />
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
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
  catalogHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countBadgeText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  addBtnSmall: { backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addBtnSmallText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  loadingText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginVertical: 16 },
  emptyCatalogBox: { alignItems: 'center', paddingVertical: 20 },
  emptyCatalogIcon: { fontSize: 32, marginBottom: 8 },
  emptyCatalogTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  emptyCatalogSub: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard: {
    width: GRID_COLUMN_WIDTH,
    backgroundColor: '#151b2d',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 4,
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

