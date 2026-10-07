import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { authStorage } from '../services/storage/authStorage';
import { useAppSelector } from '../hooks/useRedux';
import {
  useCreateProductMutation,
  useGetGlobalOptionsQuery,
  useSubmitCategoryRequestMutation,
} from '../store/api/productApi';
import { ENV_CONFIG } from '../constants/config';

interface ClothingProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct?: any) => void;
}

const FABRIC_OPTIONS = ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen', 'Polyester Blend', 'Georgette', 'Velvet', 'Handloom Linen'];
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const GENDER_OPTIONS = ['Women', 'Men', 'Unisex', 'Kids'];
const FIT_OPTIONS = ['Regular Fit', 'Slim Fit', 'Oversized', 'Tailored Fit'];
const SEASON_OPTIONS = ['Casual Wear', 'Festive / Wedding', 'Formal Workwear', 'Summer Collection', 'Winter Special'];

export const ClothingProductCreateModal: React.FC<ClothingProductCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const { data: globalOptions } = useGetGlobalOptionsQuery();
  const [submitCategoryRequest, { isLoading: isSubmittingRequest }] = useSubmitCategoryRequestMutation();

  // Custom Category & Attribute Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'CATEGORY' | 'FABRIC' | 'GENDER' | 'FIT' | 'SEASON' | 'SIZE' | 'PATTERN'>('CATEGORY');
  const [requestValue, setRequestValue] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [customOptionsMap, setCustomOptionsMap] = useState<Record<string, string[]>>({});

  // Dynamic Options Lists (Defaults + Approved Global Options + User Local Requests)
  const categoriesList = Array.from(new Set([...(globalOptions?.categories || ['Ethnic & Kurtis', 'Sarees & Lehengas', "Men's Wear & Shirts", 'T-Shirts & Casuals', 'Denim & Trousers', 'Fabric Rolls & Trims', 'Kids & Toddlers Wear']), ...(customOptionsMap['CATEGORY'] || [])]));
  const fabricsList = Array.from(new Set([...(globalOptions?.fabrics || FABRIC_OPTIONS), ...(customOptionsMap['FABRIC'] || [])]));
  const sizesList = Array.from(new Set([...(globalOptions?.sizes || SIZE_OPTIONS), ...(customOptionsMap['SIZE'] || [])]));
  const gendersList = Array.from(new Set([...(globalOptions?.genders || GENDER_OPTIONS), ...(customOptionsMap['GENDER'] || [])]));
  const fitsList = Array.from(new Set([...(globalOptions?.fitTypes || FIT_OPTIONS), ...(customOptionsMap['FIT'] || [])]));
  const seasonsList = Array.from(new Set([...(globalOptions?.seasons || SEASON_OPTIONS), ...(customOptionsMap['SEASON'] || [])]));

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`SKU-CLOTH-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [moq, setMoq] = useState<string>('20');
  const [category, setCategory] = useState('Ethnic & Kurtis');

  // Clothing Specific Specs
  const [fabric, setFabric] = useState('100% Combed Cotton');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [gender, setGender] = useState('Women');
  const [fitType, setFitType] = useState('Regular Fit');
  const [season, setSeason] = useState('Festive / Wedding');
  const [pattern, setPattern] = useState('Digital Printed');

  // Hot Selling Offers
  const [isHotSelling, setIsHotSelling] = useState(false);
  const [hotOfferText, setHotOfferText] = useState('🔥 20% OFF Special Wholesale Deal - Limited Stock!');

  // Pricing Tiers
  const [priceTiers, setPriceTiers] = useState<Array<{ minQty: number; price: number }>>([
    { minQty: 20, price: 350 },
    { minQty: 100, price: 299 },
  ]);

  // Media Local Selection & Upload
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [presetPhotoUrl, setPresetPhotoUrl] = useState('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600');
  const [videoUri, setVideoUri] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Handle Photo Pick from Phone Storage
  const handlePickPhotos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery access permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUris = result.assets.map((asset) => asset.uri);
        setPhotoUris((prev) => [...prev, ...selectedUris]);
      }
    } catch (err) {
      Alert.alert('Photo Error', 'Failed to pick photos from storage.');
    }
  };

  // Handle Video Pick from Phone Storage
  const handlePickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery access permission is required to select video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Video Error', 'Failed to pick video from storage.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleSize = (sz: string) => {
    if (selectedSizes.includes(sz)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== sz));
    } else {
      setSelectedSizes([...selectedSizes, sz]);
    }
  };

  const handleAddPriceTier = () => {
    setPriceTiers([...priceTiers, { minQty: 50, price: 320 }]);
  };

  const handleRemovePriceTier = (idx: number) => {
    setPriceTiers(priceTiers.filter((_, i) => i !== idx));
  };

  const handleOpenRequestModal = (type: 'CATEGORY' | 'FABRIC' | 'GENDER' | 'FIT' | 'SEASON' | 'SIZE' | 'PATTERN') => {
    setRequestType(type);
    setRequestValue('');
    setRequestDesc('');
    setIsRequestModalOpen(true);
  };

  const handleCustomRequestSubmit = async () => {
    if (!requestValue.trim()) return;

    try {
      const val = requestValue.trim();
      await submitCategoryRequest({
        type: requestType,
        value: val,
        description: requestDesc.trim() || undefined,
      }).unwrap();

      setCustomOptionsMap((prev) => ({
        ...prev,
        [requestType]: [...(prev[requestType] || []), val],
      }));

      if (requestType === 'CATEGORY') setCategory(val);
      if (requestType === 'FABRIC') setFabric(val);
      if (requestType === 'GENDER') setGender(val);
      if (requestType === 'FIT') setFitType(val);
      if (requestType === 'SEASON') setSeason(val);
      if (requestType === 'SIZE' && !selectedSizes.includes(val)) setSelectedSizes([...selectedSizes, val]);

      Alert.alert('Request Submitted', `🎉 Custom ${requestType} request for '${val}' submitted to Super Admin! Status: PENDING.`);
      setIsRequestModalOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err?.data?.error || err?.message || 'Failed to submit request');
    }
  };

  // Single File Upload Helper
  const uploadSingleFile = async (localUri: string): Promise<string> => {
    try {
      const token = (await authStorage.getToken()) || '';
      const formData = new FormData();
      const filename = localUri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: localUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/upload/single`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();
      return data.url || localUri;
    } catch {
      return localUri;
    }
  };

  // SUBMIT HANDLER: Upload local files first, then create product record in database
  const handleSubmit = async () => {
    if (!isApproved) {
      Alert.alert('🔒 Approval Required', 'Only Super Admin approved vendors can create clothing products.');
      return;
    }

    if (!title.trim() || !code.trim() || !description.trim()) {
      Alert.alert('⚠️ Required Fields', 'Please fill out required fields (Title, SKU, Description).');
      return;
    }

    let uploadedImageUrls: string[] = presetPhotoUrl ? [presetPhotoUrl] : [];
    let uploadedVideoUrl: string | null = videoUrlInput.trim() || null;

    try {
      setIsUploadingMedia(true);

      // STEP 1: Upload Product Photos to server if files selected
      if (photoUris.length > 0) {
        setUploadStatusText(`⏳ Uploading ${photoUris.length} photo(s) to server...`);
        for (const uri of photoUris) {
          const serverPhotoUrl = await uploadSingleFile(uri);
          uploadedImageUrls.push(serverPhotoUrl);
        }
      }

      // STEP 2: Upload Showcase Video to server if file selected
      if (videoUri) {
        setUploadStatusText('⏳ Uploading product showcase video file to server...');
        const serverVidUrl = await uploadSingleFile(videoUri);
        uploadedVideoUrl = serverVidUrl;
      }

      if (uploadedImageUrls.length === 0) {
        Alert.alert('⚠️ Photos Required', 'Please pick at least 1 photo from phone storage or specify a cover photo URL.');
        setIsUploadingMedia(false);
        return;
      }

      setUploadStatusText('🚀 Publishing clothing product to database...');

      // STEP 3: Create Product Record in Database
      const payload = {
        title: title.trim(),
        code: code.trim(),
        description: description.trim(),
        communityId: 'clothing',
        categoryId: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        moq: Number(moq) || 1,
        priceTiers,
        images: uploadedImageUrls,
        videoUrl: uploadedVideoUrl,
        isHotSelling,
        specs: {
          category,
          fabric,
          sizes: selectedSizes,
          gender,
          fitType,
          season,
          pattern,
          hotOfferDetails: isHotSelling ? hotOfferText : undefined,
        },
      };

      const result = await createProduct(payload as any).unwrap();
      Alert.alert('🎉 Published Successfully', 'Product & multimedia published to showroom catalog!');
      if (onSuccess) onSuccess(result?.product);
      onClose();
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.message || 'Failed to create product';
      Alert.alert('❌ Error', errMsg);
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>👕 Create Clothing Product Listing</Text>
              <Text style={styles.headerSub}>Fill specifications, photos & video for wholesale catalog</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!user ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedTitle}>Sign In Required</Text>
              <Text style={styles.lockedSub}>You must be logged in as an approved vendor to list clothing products.</Text>
            </View>
          ) : !isApproved ? (
            /* STRICT APPROVAL GUARD */
            <View style={styles.lockedBox}>
              <View style={styles.lockBadgeIcon}>
                <Text style={{ fontSize: 24 }}>🔒</Text>
              </View>
              <Text style={styles.lockedTag}>APPROVAL REQUIRED</Text>
              <Text style={styles.lockedTitle}>Product Creation Locked</Text>
              <Text style={styles.lockedSub}>
                Super Admin approval is strictly required before listing products in the Clothing & Textiles community.
              </Text>

              <View style={styles.userInfoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Seller:</Text>
                  <Text style={styles.infoVal}>{user.fullName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={styles.statusAmber}>⏳ {user.status || 'UNVERIFIED'}</Text>
                </View>
              </View>
            </View>
          ) : (
            /* FORM CONTENT */
            <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Verified Seller Banner */}
              <View style={styles.verifiedBanner}>
                <Text style={styles.verifiedText}>✓ Verified Seller ({user.fullName})</Text>
                <Text style={styles.approvedTag}>APPROVED SELLER</Text>
              </View>

              {/* Progress Indicator */}
              {isUploadingMedia && (
                <View style={styles.uploadProgressCard}>
                  <ActivityIndicator size="small" color="#818cf8" />
                  <Text style={styles.uploadProgressText}>{uploadStatusText}</Text>
                </View>
              )}

              {/* Basic Fields */}
              <Text style={styles.sectionLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Designer Heavy Silk Kurti Set"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.sectionLabel}>Product SKU / Code *</Text>
              <TextInput
                style={[styles.input, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. SKU-CLOTH-505"
                placeholderTextColor="#64748b"
              />

              {/* Category Picker Selector */}
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Clothing Category</Text>
                <TouchableOpacity onPress={() => handleOpenRequestModal('CATEGORY')}>
                  <Text style={styles.requestLink}>+ Request New Category</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categoriesList.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.chipItem, category === cat && styles.chipItemActive]}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>Minimum Order Quantity (MOQ) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={moq}
                onChangeText={setMoq}
                placeholder="20"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.sectionLabel}>Detailed Description *</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe fabric GSM, weaving details, wash care, packaging specs..."
                placeholderTextColor="#64748b"
              />

              {/* Clothing Specifications & Attributes */}
              <View style={styles.specCard}>
                <View style={styles.labelRow}>
                  <Text style={styles.specCardTitle}>👗 Clothing Specifications</Text>
                  <TouchableOpacity onPress={() => handleOpenRequestModal('FABRIC')}>
                    <Text style={styles.requestLink}>+ Custom Specs</Text>
                  </TouchableOpacity>
                </View>

                {/* Fabric Selector */}
                <Text style={styles.subLabel}>Fabric Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {fabricsList.map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFabric(f)}
                      style={[styles.chipItem, fabric === f && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipText, fabric === f && styles.chipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Gender Selector */}
                <Text style={styles.subLabel}>Target Gender / Age</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {gendersList.map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      style={[styles.chipItem, gender === g && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Fit Type Selector */}
                <Text style={styles.subLabel}>Fit Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {fitsList.map((ft) => (
                    <TouchableOpacity
                      key={ft}
                      onPress={() => setFitType(ft)}
                      style={[styles.chipItem, fitType === ft && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipText, fitType === ft && styles.chipTextActive]}>{ft}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Season Selector */}
                <Text style={styles.subLabel}>Season / Occasion</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {seasonsList.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSeason(s)}
                      style={[styles.chipItem, season === s && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipText, season === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Sizes Chip Toggle Matrix */}
                <View style={styles.labelRow}>
                  <Text style={styles.subLabel}>Available Sizes (Tap to Toggle)</Text>
                  <TouchableOpacity onPress={() => handleOpenRequestModal('SIZE')}>
                    <Text style={styles.requestLink}>+ Custom Size</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {sizesList.map((sz) => {
                    const active = selectedSizes.includes(sz);
                    return (
                      <TouchableOpacity
                        key={sz}
                        onPress={() => handleToggleSize(sz)}
                        style={[styles.sizeChip, active && styles.sizeChipActive]}
                      >
                        <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>{sz}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 🔥 Hot Selling Offer Toggle */}
              <View style={styles.hotSellingCard}>
                <View style={styles.hotHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18 }}>🔥</Text>
                    <View>
                      <Text style={styles.hotTitle}>Hot Selling Offer Status</Text>
                      <Text style={styles.hotSub}>Promote this item in Hot Offers showcase</Text>
                    </View>
                  </View>
                  <Switch
                    value={isHotSelling}
                    onValueChange={setIsHotSelling}
                    trackColor={{ false: '#334155', true: '#f59e0b' }}
                  />
                </View>

                {isHotSelling && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.subLabel}>Hot Offer Tag Text</Text>
                    <TextInput
                      style={[styles.input, { borderColor: '#f59e0b' }]}
                      value={hotOfferText}
                      onChangeText={setHotOfferText}
                      placeholder="e.g. 🔥 FLAT 25% OFF on 100+ Pieces!"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                )}
              </View>

              {/* Wholesale Bulk Price Tiers */}
              <View style={styles.tiersCard}>
                <View style={styles.labelRow}>
                  <Text style={styles.specCardTitle}>💰 Wholesale Bulk Price Tiers (₹ / Piece)</Text>
                  <TouchableOpacity onPress={handleAddPriceTier} style={styles.addTierBtn}>
                    <Text style={styles.addTierBtnText}>+ Add Tier</Text>
                  </TouchableOpacity>
                </View>

                {priceTiers.map((tier, idx) => (
                  <View key={idx} style={styles.tierRow}>
                    <Text style={styles.tierLabel}>Tier #{idx + 1}:</Text>
                    <TextInput
                      style={styles.tierInput}
                      keyboardType="numeric"
                      value={String(tier.minQty)}
                      onChangeText={(val) => {
                        const updated = [...priceTiers];
                        updated[idx].minQty = Number(val) || 1;
                        setPriceTiers(updated);
                      }}
                      placeholder="Min Qty"
                      placeholderTextColor="#64748b"
                    />
                    <Text style={styles.tierSuffix}>+ pcs @ ₹</Text>
                    <TextInput
                      style={[styles.tierInput, { borderColor: '#10b981', color: '#10b981', fontWeight: 'bold' }]}
                      keyboardType="numeric"
                      value={String(tier.price)}
                      onChangeText={(val) => {
                        const updated = [...priceTiers];
                        updated[idx].price = Number(val) || 0;
                        setPriceTiers(updated);
                      }}
                      placeholder="Price"
                      placeholderTextColor="#64748b"
                    />
                    {priceTiers.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemovePriceTier(idx)} style={{ padding: 4 }}>
                        <Text style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* 📸 Product Photos Upload Section */}
              <View style={styles.mediaCard}>
                <View style={styles.labelRow}>
                  <View>
                    <Text style={styles.specCardTitle}>📸 Product Photos</Text>
                    <Text style={styles.mediaSub}>Select image files from local phone gallery</Text>
                  </View>
                  <TouchableOpacity onPress={handlePickPhotos} style={styles.pickMediaBtn}>
                    <Text style={styles.pickMediaBtnText}>📁 Pick Photos</Text>
                  </TouchableOpacity>
                </View>

                {photoUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {photoUris.map((uri, idx) => (
                      <View key={idx} style={styles.photoPreviewBox}>
                        <Image source={{ uri }} style={styles.photoPreviewImg} />
                        <TouchableOpacity onPress={() => handleRemovePhoto(idx)} style={styles.photoRemoveBtn}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.subLabel}>Preset Cover Photo URL (Fallback option)</Text>
                <TextInput
                  style={styles.input}
                  value={presetPhotoUrl}
                  onChangeText={setPresetPhotoUrl}
                  placeholder="https://..."
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* 🎥 Product Showcase Video Upload Section */}
              <View style={styles.mediaCard}>
                <View style={styles.labelRow}>
                  <View>
                    <Text style={styles.specCardTitle}>🎥 Product Showcase Video</Text>
                    <Text style={styles.mediaSub}>Select video file from local phone gallery</Text>
                  </View>
                  <TouchableOpacity onPress={handlePickVideo} style={[styles.pickMediaBtn, { backgroundColor: '#9333ea' }]}>
                    <Text style={styles.pickMediaBtnText}>🎥 Pick Video</Text>
                  </TouchableOpacity>
                </View>

                {videoUri ? (
                  <View style={styles.videoSelectedBox}>
                    <Text style={styles.videoSelectedText} numberOfLines={1}>Selected Video: {videoUri.split('/').pop()}</Text>
                    <TouchableOpacity onPress={() => setVideoUri('')}>
                      <Text style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.subLabel}>Or Video URL (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={videoUrlInput}
                      onChangeText={setVideoUrlInput}
                      placeholder="https://..."
                      placeholderTextColor="#64748b"
                    />
                  </View>
                )}
              </View>

              {/* Footer Submit Buttons */}
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isCreating || isUploadingMedia}
                  style={[styles.submitBtn, (isCreating || isUploadingMedia) && { opacity: 0.5 }]}
                >
                  {isCreating || isUploadingMedia ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>🚀 Upload & Publish Product ➔</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* CUSTOM CATEGORY / ATTRIBUTE REQUEST MODAL POPUP */}
          {isRequestModalOpen && (
            <View style={styles.requestOverlay}>
              <View style={styles.requestContainer}>
                <View style={styles.labelRow}>
                  <View>
                    <Text style={styles.requestTag}>SUPER ADMIN APPROVAL FLOW</Text>
                    <Text style={styles.requestTitle}>🏷️ Request New {requestType} Option</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsRequestModalOpen(false)}>
                    <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.requestNotice}>
                  Submit your request to Super Admin. It will enter PENDING status and automatically become available globally once approved!
                </Text>

                <Text style={styles.sectionLabel}>Requested {requestType} Name *</Text>
                <TextInput
                  style={styles.input}
                  value={requestValue}
                  onChangeText={setRequestValue}
                  placeholder={`Enter custom ${requestType} name...`}
                  placeholderTextColor="#64748b"
                />

                <Text style={styles.sectionLabel}>Optional Notes for Admin</Text>
                <TextInput
                  style={styles.input}
                  value={requestDesc}
                  onChangeText={setRequestDesc}
                  placeholder="e.g. Requested by buyers in regional market"
                  placeholderTextColor="#64748b"
                />

                <View style={[styles.footerRow, { marginTop: 12 }]}>
                  <TouchableOpacity onPress={() => setIsRequestModalOpen(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCustomRequestSubmit}
                    disabled={isSubmittingRequest || !requestValue.trim()}
                    style={[styles.submitBtn, { backgroundColor: '#f59e0b' }, (!requestValue.trim() || isSubmittingRequest) && { opacity: 0.5 }]}
                  >
                    {isSubmittingRequest ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={[styles.submitBtnText, { color: '#000' }]}>🚀 Submit to Admin</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
    padding: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollBody: {
    paddingRight: 4,
  },
  lockedBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginVertical: 20,
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  lockedSub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  userInfoBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  infoVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusAmber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  verifiedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  approvedTag: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  uploadProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  uploadProgressText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#a5b4fc',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginTop: 8,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  requestLink: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f59e0b',
    textDecorationLine: 'underline',
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  chipItemActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  chipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  specCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginVertical: 10,
  },
  specCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sizeChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  sizeChipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sizeChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  hotSellingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 12,
    borderRadius: 14,
    marginVertical: 10,
  },
  hotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hotTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fcd34d',
  },
  hotSub: {
    fontSize: 9,
    color: '#94a3b8',
  },
  tiersCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginVertical: 10,
  },
  addTierBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addTierBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#818cf8',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  tierLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  tierInput: {
    width: 60,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
  },
  tierSuffix: {
    fontSize: 10,
    color: '#94a3b8',
  },
  mediaCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginVertical: 8,
  },
  mediaSub: {
    fontSize: 9,
    color: '#94a3b8',
  },
  pickMediaBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pickMediaBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  photoPreviewBox: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSelectedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  videoSelectedText: {
    fontSize: 10,
    color: '#34d399',
    fontWeight: 'bold',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  requestOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },
  requestContainer: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 16,
    padding: 16,
  },
  requestTag: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  requestNotice: {
    fontSize: 10,
    color: '#94a3b8',
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    lineHeight: 14,
  },
});
