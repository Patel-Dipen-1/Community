import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetMyStoreQuery, useGetStoreByIdQuery, useUpdateStoreMutation } from '../../store/api/storeApi';
import { useCreateProductMutation, useDeleteProductMutation } from '../../store/api/productApi';
import { ClothingProductCreateModal } from '../../components/ClothingProductCreateModal';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../../services/storage/authStorage';
import { useAppSelector } from '../../hooks/useRedux';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Store'>;

const { width } = Dimensions.get('window');

/**
 * Helper to upload local gallery image to backend API
 */
const uploadLocalImage = async (localUri: string): Promise<string> => {
  try {
    const formData = new FormData();
    const filename = localUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: localUri,
      name: filename,
      type,
    } as any);

    const token = await authStorage.getToken();
    const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/upload/single`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    const data = await response.json();
    return data.url || localUri;
  } catch (err) {
    console.log('Image upload network fallback to local URI:', err);
    return localUri;
  }
};

export const StoreScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const targetBusinessId = route?.params?.businessId;

  // Dual mode query: My store vs Target Supplier Store
  const { data: myStoreData, isLoading: loadingMyStore, refetch: refetchMyStore } = useGetMyStoreQuery(
    undefined,
    { skip: Boolean(targetBusinessId) }
  );
  const { data: publicStoreData, isLoading: loadingPublicStore, refetch: refetchPublicStore } = useGetStoreByIdQuery(
    targetBusinessId || '',
    { skip: !targetBusinessId }
  );

  const isViewingOtherStore = Boolean(targetBusinessId && targetBusinessId !== user?.business?.id);
  const storeData = isViewingOtherStore ? publicStoreData : myStoreData;
  const isLoading = isViewingOtherStore ? loadingPublicStore : loadingMyStore;
  const refetch = isViewingOtherStore ? refetchPublicStore : refetchMyStore;

  const [updateStore, { isLoading: isUpdatingStore }] = useUpdateStoreMutation();
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  // Search & category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Edit Store Modal state
  const [editStoreModalOpen, setEditStoreModalOpen] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeBioInput, setStoreBioInput] = useState('');
  const [storeBannerUri, setStoreBannerUri] = useState('');
  const [storeLogoUri, setStoreLogoUri] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Add Product Modal state
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [prodTitle, setProdTitle] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodMoq, setProdMoq] = useState('10');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('General');
  const [prodImageUri, setProdImageUri] = useState('');

  // Selected Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const store = (storeData as any)?.store;
  const biz = (storeData as any)?.business || store?.business || user?.business;
  const products: any[] = (storeData as any)?.products || store?.products || [];

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.specs?.Category || 'General')))];

  // Filter products by search & category
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || (p.specs?.Category || 'General') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Open Edit Store Modal with initial values
  const handleOpenEditStore = () => {
    setStoreNameInput(store?.name || biz?.shopName || '');
    setStoreBioInput(store?.bio || '');
    setStoreBannerUri(store?.bannerUrl || '');
    setStoreLogoUri(store?.logoUrl || '');
    setEditStoreModalOpen(true);
  };

  // Local Image Picker for Gallery / Storage
  const handlePickLocalImage = async (onSelected: (uri: string) => void) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to pick photos from your phone storage.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = result.assets[0].uri;
        setIsUploadingImage(true);
        const uploadedUrl = await uploadLocalImage(localUri);
        setIsUploadingImage(false);
        onSelected(uploadedUrl);
        Alert.alert('Image Selected', 'Photo selected from local storage successfully!');
      }
    } catch (err) {
      setIsUploadingImage(false);
      Alert.alert('Image Error', 'Unable to pick image from local gallery.');
    }
  };

  // Save Store Edit
  const handleSaveStore = async () => {
    if (!storeNameInput.trim()) {
      Alert.alert('Store Name Required', 'Please enter a name for your store.');
      return;
    }

    try {
      await updateStore({
        name: storeNameInput.trim(),
        bio: storeBioInput.trim(),
        bannerUrl: storeBannerUri,
        logoUrl: storeLogoUri,
      }).unwrap();

      setEditStoreModalOpen(false);
      refetch();
      Alert.alert('Success', 'Store profile and branding updated!');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.data?.error || 'Failed to update store.');
    }
  };

  // Save New Product
  const handleCreateProduct = async () => {
    if (!prodTitle.trim() || !prodCode.trim() || !prodPrice.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Title, SKU Code, and Price.');
      return;
    }

    try {
      await createProduct({
        title: prodTitle.trim(),
        code: prodCode.trim(),
        description: prodDesc.trim() || prodTitle.trim(),
        moq: parseInt(prodMoq, 10) || 1,
        priceTiers: [{ minQty: parseInt(prodMoq, 10) || 1, price: parseFloat(prodPrice) || 100 }],
        images: [prodImageUri || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&q=80'],
        specs: { Category: prodCategory || 'General' },
        communityId: biz?.allowedCommunities?.[0] || 'clothing',
        isHotSelling: true,
      } as any).unwrap();

      setAddProductModalOpen(false);
      setProdTitle('');
      setProdCode('');
      setProdPrice('');
      setProdImageUri('');
      refetch();
      Alert.alert('Product Listed', `SKU ${prodCode} listed successfully in store!`);
    } catch (err: any) {
      Alert.alert('Listing Failed', err?.data?.error || 'Unable to create product.');
    }
  };

  // Delete Product
  const handleDeleteProduct = (productId: string, title: string) => {
    Alert.alert('Delete Product', `Are you sure you want to remove "${title}" from your catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(productId).unwrap();
            refetch();
            Alert.alert('Product Deleted', `"${title}" has been removed.`);
          } catch (err: any) {
            Alert.alert('Error', err?.data?.error || 'Failed to delete product.');
          }
        },
      },
    ]);
  };

  // Share Store Link
  const handleShareStore = () => {
    Share.share({
      title: store?.name || 'B2B Wholesale Store',
      message: `Check out our verified B2B store catalog on B2B Community Platform: ${ENV_CONFIG.SOCKET_URL}/store/${store?.slug || store?.id || 'me'}`,
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title={store?.name || 'My B2B Showroom'}
        subtitle="Web Parity B2B Catalog & Local Image Upload"
        rightElement={
          <TouchableOpacity style={styles.headerSharePill} onPress={handleShareStore}>
            <Text style={styles.headerShareText}>🔗 Share</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ============================================================ */}
        {/* 1. STORE HERO BANNER & BRANDING HEADER */}
        {/* ============================================================ */}
        <View style={styles.heroBannerCard}>
          <Image
            source={{
              uri: store?.bannerUrl || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1000&q=80',
            }}
            style={styles.heroBannerImage}
          />
          <View style={styles.bannerDarkGradient} />

          <View style={styles.heroContentRow}>
            {/* Logo Avatar */}
            <View style={styles.storeLogoBox}>
              {store?.logoUrl ? (
                <Image source={{ uri: store.logoUrl }} style={styles.storeLogoImage} />
              ) : (
                <Text style={styles.storeLogoInitial}>{store?.name?.charAt(0).toUpperCase() || 'S'}</Text>
              )}
            </View>

            {/* Store Meta */}
            <View style={styles.heroMetaBox}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.heroStoreTitle} numberOfLines={1}>
                  {store?.name || 'Royal Wholesale Store'}
                </Text>
                {biz?.verificationTag && <Text style={styles.verifiedTagPill}>✓ VERIFIED B2B</Text>}
              </View>

              <Text style={styles.heroSubText} numberOfLines={1}>
                {biz?.shopName || 'Wholesale Business Catalog'} • 📍 {biz?.city || 'Surat'}, {biz?.state || 'Gujarat'}
              </Text>

              <View style={styles.communityPillRow}>
                {biz?.allowedCommunities?.map((comm: string) => (
                  <View key={comm} style={styles.commTagPill}>
                    <Text style={styles.commTagText}>🏷️ {comm}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Action CTAs Row */}
          {!isViewingOtherStore ? (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity style={styles.editStoreBtn} onPress={handleOpenEditStore}>
                <Text style={styles.editStoreBtnText}>✏️ Edit Store</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addProductBtn} onPress={() => setAddProductModalOpen(true)}>
                <Text style={styles.addProductBtnText}>➕ Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.chatVendorBtn}
                onPress={() => {
                  if (biz?.id) {
                    navigation.navigate('ChatDetail', {
                      conversationId: '',
                      recipientId: biz.id,
                      recipientName: biz.shopName || 'Vendor',
                    });
                  }
                }}
              >
                <Text style={styles.chatVendorBtnText}>💬 Chat with Vendor</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Store Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumberGreen}>{products.filter((p) => p.isActive).length}</Text>
              <Text style={styles.statLabel}>Active Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumberIndigo}>{user?.fullName || 'Owner'}</Text>
              <Text style={styles.statLabel}>Proprietor</Text>
            </View>
          </View>
        </View>

        {/* Store Bio */}
        {store?.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioTitle}>Store Bio & Overview</Text>
            <Text style={styles.bioText}>{store.bio}</Text>
          </View>
        ) : null}

        {/* ============================================================ */}
        {/* 2. CATEGORY TABS & SEARCH TOOLBAR */}
        {/* ============================================================ */}
        <View style={styles.filterToolbar}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by title or SKU..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Horizontal Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.catPillText, selectedCategory === cat && styles.catPillTextActive]}>
                  {cat === 'ALL' ? `All Items (${products.length})` : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 3. PRODUCT CATALOG GRID */}
        {/* ============================================================ */}
        <View style={styles.catalogSectionHeader}>
          <Text style={styles.catalogSectionTitle}>📦 Showroom Catalog ({filteredProducts.length})</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#818cf8" style={{ marginVertical: 30 }} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="🏪"
            title="No Products Found"
            description={
              searchQuery || selectedCategory !== 'ALL'
                ? 'No catalog items matched your search query or category filter.'
                : 'Your store catalog is empty. Tap "+ Add Product" to publish items from gallery.'
            }
            actionTitle="+ Add Product from Gallery"
            onAction={() => setAddProductModalOpen(true)}
          />
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((p) => {
              const priceVal = p.priceTiers?.[0]?.price || 100;
              const imgUrl = p.images?.[0] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&q=80';
              return (
                <View key={p.id} style={styles.productCard}>
                  {/* Image & SKU Badge */}
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedProduct(p)}>
                    <View style={styles.prodImgWrapper}>
                      <Image source={{ uri: imgUrl }} style={styles.prodImage} />
                      <View style={styles.skuBadge}>
                        <Text style={styles.skuBadgeText}>{p.code}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Card Meta */}
                  <View style={styles.prodMeta}>
                    <Text style={styles.prodCategoryText}>{p.specs?.Category || 'Wholesale Item'}</Text>
                    <Text style={styles.prodTitle} numberOfLines={2}>
                      {p.title}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>₹{priceVal}</Text>
                      <Text style={styles.moqText}>MOQ: {p.moq || 10} pcs</Text>
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={styles.prodFooterActions}>
                    <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelectedProduct(p)}>
                      <Text style={styles.detailsBtnText}>Details 👁️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteProduct(p.id, p.title)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL 1: EDIT STORE (WITH LOCAL IMAGE UPLOAD) */}
      {/* ============================================================ */}
      <Modal visible={editStoreModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitleBlue}>✏️ Edit Store Profile & Branding</Text>

              <Input label="Store Name *" value={storeNameInput} onChangeText={setStoreNameInput} />
              <Input label="Store Bio / Tagline" value={storeBioInput} onChangeText={setStoreBioInput} multiline numberOfLines={3} />

              {/* Local Storage Banner Image Picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Store Banner Image</Text>
                {storeBannerUri ? (
                  <Image source={{ uri: storeBannerUri }} style={styles.pickerPreviewBanner} />
                ) : null}
                <TouchableOpacity
                  style={styles.pickImageBtn}
                  onPress={() => handlePickLocalImage(setStoreBannerUri)}
                >
                  <Text style={styles.pickImageBtnText}>📸 Pick Banner Image from Phone</Text>
                </TouchableOpacity>
              </View>

              {/* Local Storage Logo Image Picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Store Logo Image</Text>
                {storeLogoUri ? (
                  <Image source={{ uri: storeLogoUri }} style={styles.pickerPreviewLogo} />
                ) : null}
                <TouchableOpacity
                  style={styles.pickImageBtn}
                  onPress={() => handlePickLocalImage(setStoreLogoUri)}
                >
                  <Text style={styles.pickImageBtnText}>📸 Pick Logo Image from Phone</Text>
                </TouchableOpacity>
              </View>

              {isUploadingImage && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color="#818cf8" />
                  <Text style={styles.uploadingText}>Uploading photo from local storage...</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => setEditStoreModalOpen(false)} style={{ flex: 1 }} />
                <Button title="Save Store" loading={isUpdatingStore} onPress={handleSaveStore} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: ADD CLOTHING PRODUCT (FULL WEB PARITY) */}
      {/* ============================================================ */}
      <ClothingProductCreateModal
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={() => refetchMyStore()}
      />

      {/* ============================================================ */}
      {/* MODAL 3: SELECTED PRODUCT DETAIL PREVIEW */}
      {/* ============================================================ */}
      {selectedProduct && (
        <Modal visible animationType="fade" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.prodDetailHeader}>
                <Text style={styles.prodDetailTitle} numberOfLines={1}>{selectedProduct.title}</Text>
                <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Image
                source={{ uri: selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&q=80' }}
                style={styles.detailImage}
              />

              <View style={styles.detailMetaRow}>
                <Text style={styles.detailSku}>SKU: {selectedProduct.code}</Text>
                <Text style={styles.detailPrice}>₹{selectedProduct.priceTiers?.[0]?.price || 100} / unit</Text>
              </View>

              <Text style={styles.detailMoq}>Minimum Order Quantity (MOQ): {selectedProduct.moq || 10} units</Text>
              <Text style={styles.detailDesc}>{selectedProduct.description || 'No description provided.'}</Text>

              <Button title="Close" variant="secondary" onPress={() => setSelectedProduct(null)} style={{ marginTop: 14 }} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },

  headerSharePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerShareText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },

  // Hero Card
  heroBannerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroBannerImage: { width: '100%', height: 130 },
  bannerDarkGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
  },
  heroContentRow: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -30,
    alignItems: 'flex-end',
  },
  storeLogoBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#1e1b4b',
    borderWidth: 3,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeLogoImage: { width: '100%', height: '100%', borderRadius: 15 },
  storeLogoInitial: { color: '#818cf8', fontSize: 28, fontWeight: '900' },
  heroMetaBox: { flex: 1 },
  titleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  heroStoreTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  verifiedTagPill: {
    color: '#4edea3',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  heroSubText: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  communityPillRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  commTagPill: { backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  commTagText: { color: '#c0c1ff', fontSize: 9, fontWeight: '700' },

  heroActionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  editStoreBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  editStoreBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '800' },
  addProductBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#00a572',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  chatVendorBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatVendorBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#151b2d',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  statNumberGreen: { color: '#4edea3', fontSize: 16, fontWeight: '900' },
  statNumberIndigo: { color: '#818cf8', fontSize: 14, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: '#1e293b' },

  bioCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 16,
  },
  bioTitle: { color: '#818cf8', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  bioText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },

  // Filters
  filterToolbar: { marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 13 },

  catScroll: { flexDirection: 'row' },
  catPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 8,
  },
  catPillActive: { backgroundColor: '#00a572', borderColor: '#00a572' },
  catPillText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  catPillTextActive: { color: '#ffffff', fontWeight: '900' },

  // Catalog Grid
  catalogSectionHeader: { marginBottom: 12 },
  catalogSectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 4,
  },
  prodImgWrapper: { width: '100%', height: 130, backgroundColor: '#151b2d', position: 'relative' },
  prodImage: { width: '100%', height: '100%' },
  skuBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  skuBadgeText: { color: '#4edea3', fontSize: 9, fontWeight: '900' },

  prodMeta: { padding: 10 },
  prodCategoryText: { color: '#64748b', fontSize: 9, fontWeight: '700' },
  prodTitle: { color: '#ffffff', fontSize: 12, fontWeight: '800', marginTop: 2, height: 32 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  priceText: { color: '#4edea3', fontSize: 14, fontWeight: '900' },
  moqText: { color: '#94a3b8', fontSize: 9, fontWeight: '600' },

  prodFooterActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 8,
    gap: 6,
  },
  detailsBtn: {
    flex: 1,
    height: 32,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: { color: '#f8fafc', fontSize: 11, fontWeight: '700' },
  deleteBtn: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 13 },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  modalScroll: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitleBlue: { color: '#818cf8', fontSize: 18, fontWeight: '900', marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  pickerSection: { marginBottom: 14 },
  pickerLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  pickImageBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  pickImageBtnText: { color: '#818cf8', fontSize: 12, fontWeight: '800' },
  pickerPreviewBanner: { width: '100%', height: 90, borderRadius: 10, marginBottom: 8 },
  pickerPreviewLogo: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  uploadingText: { color: '#818cf8', fontSize: 11, fontWeight: '700' },

  prodDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  prodDetailTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', flex: 1 },
  closeBtnText: { color: '#94a3b8', fontSize: 18, fontWeight: '900', paddingHorizontal: 8 },
  detailImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  detailSku: { color: '#4edea3', fontSize: 12, fontWeight: '900' },
  detailPrice: { color: '#818cf8', fontSize: 16, fontWeight: '900' },
  detailMoq: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  detailDesc: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
});

