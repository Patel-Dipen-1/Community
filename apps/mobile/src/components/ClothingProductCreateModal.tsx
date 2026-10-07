import React, { useState, useEffect } from 'react';
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
  useUpdateProductMutation,
  useGetGlobalOptionsQuery,
  useSubmitCategoryRequestMutation,
} from '../store/api/productApi';
import { ENV_CONFIG } from '../constants/config';

interface ClothingProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct?: any) => void;
  initialProduct?: any;
}

const COMMUNITIES = [
  { id: 'clothing', name: '👕 Clothing', label: 'Clothing & Textiles' },
  { id: 'hardware', name: '🔧 Hardware', label: 'Hardware & Tools' },
  { id: 'jewellery', name: '💎 Jewellery', label: 'Jewellery & Gems' },
  { id: 'electronics', name: '⚡ Electronics', label: 'Electronics & Electricals' },
  { id: 'grocery', name: '🌾 Grocery', label: 'Grocery & FMCG' },
];

const FABRIC_OPTIONS = ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen', 'Polyester Blend', 'Georgette', 'Velvet', 'Handloom Linen'];
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size'];
const GENDER_OPTIONS = ['Women', 'Men', 'Unisex', 'Kids'];
const FIT_OPTIONS = ['Regular Fit', 'Slim Fit', 'Oversized', 'Tailored Fit'];
const SEASON_OPTIONS = ['Casual Wear', 'Festive / Wedding', 'Formal Workwear', 'Summer Collection', 'Winter Special'];

// Hardware defaults
const HARDWARE_MATERIALS = ['Stainless Steel 304', 'High Carbon Steel', 'Brass', 'Cast Iron', 'Heavy Duty Alloy', 'Chrome Vanadium', 'PVC / Polymer'];
const HARDWARE_WARRANTIES = ['No Warranty', '6 Months Brand Warranty', '1 Year Manufacturer Warranty', '2 Years Guarantee', 'Lifetime Guarantee'];
const HARDWARE_POWER_RATINGS = ['Manual / Non-Powered', '220V AC Heavy Duty', '12V Cordless Battery', '18V Brushless Lithium', '440V 3-Phase Industrial'];
const HARDWARE_FINISHES = ['Rust-Proof Zinc Coated', 'Chrome Plated', 'Matte Black Powder Coated', 'Anodized Aluminum', 'Polished Mirror Finish'];
const HARDWARE_APPLICATIONS = ['Heavy Construction', 'Workshop & Fabrication', 'Automobile Repair', 'Home DIY & Repairs', 'Electrical Installation'];

// Jewellery defaults
const JEWELLERY_PURITIES = ['24K Pure Gold (999)', '22K BIS Hallmarked (916)', '18K Diamond Gold (750)', '14K Gold', '1 Gram Micro Plated', '925 Sterling Silver'];
const JEWELLERY_GEMSTONES = ['Uncut Polki Diamond', 'Real Solitaire Diamond', 'Certified Emerald', 'Cubic Zirconia (CZ)', 'Fresh Water Pearl', 'Synthetic Ruby'];
const JEWELLERY_CERTIFICATIONS = ['BIS Hallmarked', 'IGI Certified Diamond', 'GIA Certified Solitaire', 'SGL Certified', 'Non-Certified Commercial'];

// Electronics defaults
const ELECTRONICS_POWER_SOURCES = ['Battery Operated', '220V Mains Power', 'USB-C 5V', 'Solar Powered', '12V DC Input'];
const ELECTRONICS_CONNECTIVITIES = ['Bluetooth 5.3', 'Wi-Fi 6', 'Wired USB-C', 'RF Remote Control', 'Zigbee / Smart Home'];
const ELECTRONICS_WARRANTIES = ['6 Months Repair', '1 Year Brand Warranty', '2 Years Extended Warranty'];

// Grocery defaults
const GROCERY_PACKAGINGS = ['Standard Pouch', 'Vacuum Sealed Pack', 'Tin Can', 'Jute Sack', 'Glass Jar', 'Plastic Container'];
const GROCERY_SHELF_LIVES = ['3 Months', '6 Months', '12 Months', '24 Months'];
const GROCERY_CERTIFICATIONS = ['FSSAI Licensed & Certified', '100% Organic Certified', 'ISO Standard', 'Non-GMO Certified'];

export const ClothingProductCreateModal: React.FC<ClothingProductCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');
  const isEditing = Boolean(initialProduct?.id);

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const { data: globalOptions } = useGetGlobalOptionsQuery();
  const [submitCategoryRequest, { isLoading: isSubmittingRequest }] = useSubmitCategoryRequestMutation();

  // Active Community Tab State
  const [activeCommunity, setActiveCommunity] = useState<string>('clothing');

  // Custom Category & Attribute Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<string>('CATEGORY');
  const [requestValue, setRequestValue] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [customOptionsMap, setCustomOptionsMap] = useState<Record<string, string[]>>({});

  // Dynamic Options Lists based on Global Options + Admin Approved Requests
  const clothingCategories = Array.from(new Set([...(globalOptions?.clothingCategories || globalOptions?.categories || ['Ethnic & Kurtis', 'Sarees & Lehengas', "Men's Wear & Shirts", 'T-Shirts & Casuals', 'Denim & Trousers', 'Fabric Rolls', 'Kids Wear']), ...(customOptionsMap['CATEGORY'] || [])]));
  const hardwareCategories = Array.from(new Set([...(globalOptions?.hardwareCategories || ['Power Tools', 'Hand Tools', 'Fasteners & Bolts', 'Plumbing & Pipes', 'Paints & Chemicals', 'Safety Equipment', 'Machine Parts']), ...(customOptionsMap['CATEGORY_HARDWARE'] || [])]));
  const jewelleryCategories = Array.from(new Set([...(globalOptions?.jewelleryCategories || ['Gold Jewellery', 'Diamond Jewellery', '1 Gram Gold / Imitation', 'Sterling Silver 925', 'Gemstones & Pearls', 'Bridal Sets']), ...(customOptionsMap['CATEGORY_JEWELLERY'] || [])]));
  const electronicsCategories = Array.from(new Set([...(globalOptions?.electronicsCategories || ['Smartphones & Accessories', 'Audio & Speakers', 'Cables & Chargers', 'Home Appliances', 'Circuit Boards & Sensors', 'LED Lighting']), ...(customOptionsMap['CATEGORY_ELECTRONICS'] || [])]));
  const groceryCategories = Array.from(new Set([...(globalOptions?.groceryCategories || ['Spices & Masala', 'Grains & Pulses', 'Edible Oils', 'Dry Fruits & Nuts', 'Packaged Snacks', 'Organic Staples']), ...(customOptionsMap['CATEGORY_GROCERY'] || [])]));

  const fabricsList = Array.from(new Set([...(globalOptions?.fabrics || FABRIC_OPTIONS), ...(customOptionsMap['FABRIC'] || [])]));
  const sizesList = Array.from(new Set([...(globalOptions?.sizes || SIZE_OPTIONS), ...(customOptionsMap['SIZE'] || [])]));
  const gendersList = Array.from(new Set([...(globalOptions?.genders || GENDER_OPTIONS), ...(customOptionsMap['GENDER'] || [])]));
  const fitsList = Array.from(new Set([...(globalOptions?.fitTypes || FIT_OPTIONS), ...(customOptionsMap['FIT'] || [])]));
  const seasonsList = Array.from(new Set([...(globalOptions?.seasons || SEASON_OPTIONS), ...(customOptionsMap['SEASON'] || [])]));

  const hardwareMaterials = Array.from(new Set([...(globalOptions?.hardwareMaterials || HARDWARE_MATERIALS), ...(customOptionsMap['HARDWARE_MATERIAL'] || [])]));
  const hardwareWarranties = Array.from(new Set([...(globalOptions?.hardwareWarranties || HARDWARE_WARRANTIES), ...(customOptionsMap['HARDWARE_WARRANTY'] || [])]));
  const hardwarePowerRatings = Array.from(new Set([...(globalOptions?.hardwarePowerRatings || HARDWARE_POWER_RATINGS), ...(customOptionsMap['HARDWARE_POWER'] || [])]));
  const hardwareFinishes = Array.from(new Set([...(globalOptions?.hardwareFinishes || HARDWARE_FINISHES), ...(customOptionsMap['HARDWARE_FINISH'] || [])]));
  const hardwareApplications = Array.from(new Set([...(globalOptions?.hardwareApplications || HARDWARE_APPLICATIONS), ...(customOptionsMap['HARDWARE_APPLICATION'] || [])]));

  const jewelleryPurities = Array.from(new Set([...(globalOptions?.jewelleryPurities || JEWELLERY_PURITIES), ...(customOptionsMap['JEWELLERY_PURITY'] || [])]));
  const jewelleryGemstones = Array.from(new Set([...(globalOptions?.jewelleryGemstones || JEWELLERY_GEMSTONES), ...(customOptionsMap['JEWELLERY_GEMSTONE'] || [])]));
  const jewelleryCertifications = Array.from(new Set([...(globalOptions?.jewelleryCertifications || JEWELLERY_CERTIFICATIONS), ...(customOptionsMap['JEWELLERY_CERT'] || [])]));

  const electronicsPowerSources = Array.from(new Set([...(globalOptions?.electronicsPowerSources || ELECTRONICS_POWER_SOURCES), ...(customOptionsMap['ELEC_POWER'] || [])]));
  const electronicsConnectivities = Array.from(new Set([...(globalOptions?.electronicsConnectivities || ELECTRONICS_CONNECTIVITIES), ...(customOptionsMap['ELEC_CONN'] || [])]));
  const electronicsWarranties = Array.from(new Set([...(globalOptions?.electronicsWarranties || ELECTRONICS_WARRANTIES), ...(customOptionsMap['ELEC_WARRANTY'] || [])]));

  const groceryPackagings = Array.from(new Set([...(globalOptions?.groceryPackagings || GROCERY_PACKAGINGS), ...(customOptionsMap['GROCERY_PACK'] || [])]));
  const groceryShelfLives = Array.from(new Set([...(globalOptions?.groceryShelfLives || GROCERY_SHELF_LIVES), ...(customOptionsMap['GROCERY_SHELF'] || [])]));
  const groceryCertifications = Array.from(new Set([...(globalOptions?.groceryCertifications || GROCERY_CERTIFICATIONS), ...(customOptionsMap['GROCERY_CERT'] || [])]));

  // Common Universal Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`SKU-B2B-${Math.floor(100 + Math.random() * 900)}`);
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

  // Hardware Specs
  const [hwMaterial, setHwMaterial] = useState('Stainless Steel 304');
  const [hwWarranty, setHwWarranty] = useState('1 Year Manufacturer Warranty');
  const [hwPower, setHwPower] = useState('Manual / Non-Powered');
  const [hwFinish, setHwFinish] = useState('Rust-Proof Zinc Coated');
  const [hwApp, setHwApp] = useState('Heavy Construction');

  // Jewellery Specs
  const [jwlPurity, setJwlPurity] = useState('22K BIS Hallmarked (916)');
  const [jwlWeight, setJwlWeight] = useState('10 Grams');
  const [jwlGemstone, setJwlGemstone] = useState('Uncut Polki Diamond');
  const [jwlCert, setJwlCert] = useState('BIS Hallmarked');

  // Electronics Specs
  const [elecPower, setElecPower] = useState('220V Mains Power');
  const [elecConn, setElecConn] = useState('Bluetooth 5.3');
  const [elecWarranty, setElecWarranty] = useState('1 Year Brand Warranty');

  // Grocery Specs
  const [grocPack, setGrocPack] = useState('Standard Pouch');
  const [grocShelf, setGrocShelf] = useState('12 Months');
  const [grocCert, setGrocCert] = useState('FSSAI Licensed & Certified');

  // Universal Dynamic Custom Key-Value Specs (e.g. [{ key: 'Blade Diameter', value: '180mm' }])
  const [customSpecRows, setCustomSpecRows] = useState<Array<{ key: string; value: string }>>([]);

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

  // Prefill form when editing existing product or reset when creating new
  useEffect(() => {
    if (isOpen && initialProduct) {
      const comm = initialProduct.communityId || 'clothing';
      setActiveCommunity(comm);
      setTitle(initialProduct.title || '');
      setCode(initialProduct.code || '');
      setDescription(initialProduct.description || '');
      setMoq(String(initialProduct.moq || 20));
      setCategory(initialProduct.specs?.category || initialProduct.categoryId || 'General');

      // Populate community specs
      setFabric(initialProduct.specs?.fabric || '100% Combed Cotton');
      setSelectedSizes(initialProduct.specs?.sizes || ['M', 'L', 'XL']);
      setGender(initialProduct.specs?.gender || 'Women');
      setFitType(initialProduct.specs?.fitType || 'Regular Fit');
      setSeason(initialProduct.specs?.season || 'Festive / Wedding');
      setPattern(initialProduct.specs?.pattern || 'Digital Printed');

      setHwMaterial(initialProduct.specs?.materialGrade || 'Stainless Steel 304');
      setHwWarranty(initialProduct.specs?.warranty || '1 Year Manufacturer Warranty');
      setHwPower(initialProduct.specs?.powerRating || 'Manual / Non-Powered');
      setHwFinish(initialProduct.specs?.surfaceFinish || 'Rust-Proof Zinc Coated');
      setHwApp(initialProduct.specs?.application || 'Heavy Construction');

      setJwlPurity(initialProduct.specs?.goldPurity || '22K BIS Hallmarked (916)');
      setJwlWeight(initialProduct.specs?.metalWeight || '10 Grams');
      setJwlGemstone(initialProduct.specs?.gemstoneType || 'Uncut Polki Diamond');
      setJwlCert(initialProduct.specs?.certification || 'BIS Hallmarked');

      setElecPower(initialProduct.specs?.powerSource || '220V Mains Power');
      setElecConn(initialProduct.specs?.connectivity || 'Bluetooth 5.3');
      setElecWarranty(initialProduct.specs?.warrantyPeriod || '1 Year Brand Warranty');

      setGrocPack(initialProduct.specs?.packagingType || 'Standard Pouch');
      setGrocShelf(initialProduct.specs?.shelfLife || '12 Months');
      setGrocCert(initialProduct.specs?.certification || 'FSSAI Licensed & Certified');

      setIsHotSelling(Boolean(initialProduct.isHotSelling));
      setHotOfferText(initialProduct.specs?.hotOfferDetails || '🔥 20% OFF Special Wholesale Deal - Limited Stock!');
      setPriceTiers(
        initialProduct.priceTiers?.length
          ? initialProduct.priceTiers.map((t: any) => ({ minQty: Number(t.minQty) || 1, price: Number(t.price) || 0 }))
          : [
              { minQty: 20, price: 350 },
              { minQty: 100, price: 299 },
            ]
      );
      setPresetPhotoUrl(initialProduct.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600');
      setPhotoUris(initialProduct.images?.length > 1 ? initialProduct.images.slice(1) : []);
      setVideoUrlInput(initialProduct.videoUrl || '');
      setVideoUri('');
    } else if (isOpen && !initialProduct) {
      const allowedList: string[] = (
        user?.business?.allowedCommunities ||
        (user as any)?.allowedCommunities ||
        ['clothing', 'hardware', 'jewellery', 'electronics', 'grocery']
      ).map((s: string) => String(s).toLowerCase());

      const defaultComm = allowedList[0] || 'clothing';
      setActiveCommunity(defaultComm);
      setTitle('');
      setCode(`SKU-B2B-${Math.floor(100 + Math.random() * 900)}`);
      setDescription('');
      setMoq('20');
      setCategory(
        defaultComm === 'hardware'
          ? 'Power Tools'
          : defaultComm === 'jewellery'
          ? 'Gold Jewellery'
          : defaultComm === 'electronics'
          ? 'Smartphones & Accessories'
          : defaultComm === 'grocery'
          ? 'Spices & Masala'
          : 'Ethnic & Kurtis'
      );
      setFabric('100% Combed Cotton');
      setSelectedSizes(['M', 'L', 'XL']);
      setGender('Women');
      setFitType('Regular Fit');
      setSeason('Festive / Wedding');
      setPattern('Digital Printed');
      setIsHotSelling(false);
      setHotOfferText('🔥 20% OFF Special Wholesale Deal - Limited Stock!');
      setPriceTiers([
        { minQty: 20, price: 350 },
        { minQty: 100, price: 299 },
      ]);
      setPresetPhotoUrl('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600');
      setPhotoUris([]);
      setVideoUri('');
      setVideoUrlInput('');
      setCustomSpecRows([]);
    }
  }, [isOpen, initialProduct, user]);

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
    } catch {
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
    } catch {
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

  // Custom key-value spec row handlers
  const handleAddCustomSpecRow = () => {
    setCustomSpecRows([...customSpecRows, { key: '', value: '' }]);
  };

  const handleRemoveCustomSpecRow = (index: number) => {
    setCustomSpecRows(customSpecRows.filter((_, i) => i !== index));
  };

  const handleOpenRequestModal = (type: string) => {
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

      if (requestType.includes('CATEGORY')) setCategory(val);
      if (requestType === 'FABRIC') setFabric(val);
      if (requestType === 'GENDER') setGender(val);
      if (requestType === 'FIT') setFitType(val);
      if (requestType === 'SEASON') setSeason(val);
      if (requestType === 'SIZE' && !selectedSizes.includes(val)) setSelectedSizes([...selectedSizes, val]);
      if (requestType === 'HARDWARE_MATERIAL') setHwMaterial(val);
      if (requestType === 'HARDWARE_WARRANTY') setHwWarranty(val);
      if (requestType === 'JEWELLERY_PURITY') setJwlPurity(val);
      if (requestType === 'ELEC_POWER') setElecPower(val);
      if (requestType === 'GROCERY_PACK') setGrocPack(val);

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

  // SUBMIT HANDLER: Upload local files first, then create/update product record in database
  const handleSubmit = async () => {
    if (!isApproved) {
      Alert.alert('🔒 Approval Required', 'Only Super Admin approved vendors can list/edit products.');
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

      setUploadStatusText(isEditing ? '💾 Updating product in database...' : '🚀 Publishing product to database...');

      // STEP 3: Assemble Dynamic Community & Custom Specifications JSON
      let categorySpecs: Record<string, any> = { category };

      if (activeCommunity === 'clothing') {
        categorySpecs = {
          ...categorySpecs,
          fabric,
          sizes: selectedSizes,
          gender,
          fitType,
          season,
          pattern,
        };
      } else if (activeCommunity === 'hardware') {
        categorySpecs = {
          ...categorySpecs,
          materialGrade: hwMaterial,
          warranty: hwWarranty,
          powerRating: hwPower,
          surfaceFinish: hwFinish,
          application: hwApp,
        };
      } else if (activeCommunity === 'jewellery') {
        categorySpecs = {
          ...categorySpecs,
          goldPurity: jwlPurity,
          metalWeight: jwlWeight,
          gemstoneType: jwlGemstone,
          certification: jwlCert,
        };
      } else if (activeCommunity === 'electronics') {
        categorySpecs = {
          ...categorySpecs,
          powerSource: elecPower,
          connectivity: elecConn,
          warrantyPeriod: elecWarranty,
        };
      } else if (activeCommunity === 'grocery') {
        categorySpecs = {
          ...categorySpecs,
          packagingType: grocPack,
          shelfLife: grocShelf,
          certification: grocCert,
        };
      }

      // Merge dynamic key-value spec rows
      customSpecRows.forEach((row) => {
        if (row.key.trim() && row.value.trim()) {
          categorySpecs[row.key.trim()] = row.value.trim();
        }
      });

      if (isHotSelling) {
        categorySpecs.hotOfferDetails = hotOfferText;
      }

      const payload = {
        title: title.trim(),
        code: code.trim(),
        description: description.trim(),
        communityId: activeCommunity,
        categoryId: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        moq: Number(moq) || 1,
        priceTiers,
        images: uploadedImageUrls,
        videoUrl: uploadedVideoUrl,
        isHotSelling,
        specs: categorySpecs,
      };

      if (isEditing && initialProduct?.id) {
        const result = await updateProduct({ id: initialProduct.id, data: payload as any }).unwrap();
        Alert.alert('🎉 Updated Successfully', 'Product updated in showroom catalog!');
        if (onSuccess) onSuccess(result?.product);
      } else {
        const result = await createProduct(payload as any).unwrap();
        Alert.alert('🎉 Published Successfully', 'Product & multimedia published to showroom catalog!');
        if (onSuccess) onSuccess(result?.product);
      }
      onClose();
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.message || (isEditing ? 'Failed to update product' : 'Failed to create product');
      Alert.alert('❌ Error', errMsg);
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
    }
  };

  // Get active category options array
  const currentCategoryList =
    activeCommunity === 'hardware'
      ? hardwareCategories
      : activeCommunity === 'jewellery'
      ? jewelleryCategories
      : activeCommunity === 'electronics'
      ? electronicsCategories
      : activeCommunity === 'grocery'
      ? groceryCategories
      : clothingCategories;

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>
                {isEditing ? '✏️ Edit B2B Product Listing' : '📦 Create B2B Product Listing'}
              </Text>
              <Text style={styles.headerSub}>Dynamic specification form with multimedia & price tiers</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!user ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedTitle}>Sign In Required</Text>
              <Text style={styles.lockedSub}>You must be logged in as an approved vendor to list products.</Text>
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
                Super Admin approval is strictly required before listing products in the B2B Wholesale Marketplace.
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

              {/* Upload Progress Indicator */}
              {isUploadingMedia && (
                <View style={styles.uploadProgressCard}>
                  <ActivityIndicator size="small" color="#818cf8" />
                  <Text style={styles.uploadProgressText}>{uploadStatusText}</Text>
                </View>
              )}

              {/* 1. INDUSTRY COMMUNITY SELECTOR */}
              <Text style={styles.sectionLabel}>Select Target Industry Community *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(() => {
                  const allowedList: string[] = (
                    user?.business?.allowedCommunities ||
                    (user as any)?.allowedCommunities ||
                    ['clothing', 'hardware', 'jewellery', 'electronics', 'grocery']
                  ).map((s: string) => String(s).toLowerCase());

                  const visibleComms = COMMUNITIES.filter((c) =>
                    allowedList.includes(c.id.toLowerCase())
                  );

                  const displayComms = visibleComms.length > 0 ? visibleComms : COMMUNITIES;

                  return displayComms.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => {
                        setActiveCommunity(c.id);
                        if (c.id === 'clothing') setCategory('Ethnic & Kurtis');
                        else if (c.id === 'hardware') setCategory('Power Tools');
                        else if (c.id === 'jewellery') setCategory('Gold Jewellery');
                        else if (c.id === 'electronics') setCategory('Smartphones & Accessories');
                        else if (c.id === 'grocery') setCategory('Spices & Masala');
                      }}
                      style={[styles.commTab, activeCommunity === c.id && styles.commTabActive]}
                    >
                      <Text style={[styles.commTabText, activeCommunity === c.id && styles.commTabTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ));
                })()}
              </ScrollView>

              {/* 2. UNIVERSAL COMMON BRACKET FIELDS */}
              <Text style={styles.sectionLabel}>Product Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Heavy Duty Cordless Drill or Designer Silk Kurti"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.sectionLabel}>Product SKU / Code *</Text>
              <TextInput
                style={[styles.input, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. SKU-B2B-909"
                placeholderTextColor="#64748b"
              />

              {/* Dynamic Category Selector */}
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Category in {activeCommunity.toUpperCase()}</Text>
                <TouchableOpacity onPress={() => handleOpenRequestModal(`CATEGORY_${activeCommunity.toUpperCase()}`)}>
                  <Text style={styles.requestLink}>+ Request New Category</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {currentCategoryList.map((cat) => (
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
                placeholder="Describe material grade, dimensions, usage instructions, packaging specs..."
                placeholderTextColor="#64748b"
              />

              {/* ============================================================ */}
              {/* 3. DYNAMIC COMMUNITY SPECIFICATIONS SECTION */}
              {/* ============================================================ */}
              <View style={styles.specCard}>
                {activeCommunity === 'clothing' && (
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.specCardTitle}>👗 Clothing Specifications</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('FABRIC')}>
                        <Text style={styles.requestLink}>+ Custom Spec</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Fabric */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Fabric Type</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('FABRIC')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Fabric</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {fabricsList.map((f) => (
                        <TouchableOpacity key={f} onPress={() => setFabric(f)} style={[styles.chipItem, fabric === f && styles.chipItemActive]}>
                          <Text style={[styles.chipText, fabric === f && styles.chipTextActive]}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Gender */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Target Gender / Age</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('GENDER')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Gender</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {gendersList.map((g) => (
                        <TouchableOpacity key={g} onPress={() => setGender(g)} style={[styles.chipItem, gender === g && styles.chipItemActive]}>
                          <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Fit */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Fit Type</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('FIT')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Fit</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {fitsList.map((ft) => (
                        <TouchableOpacity key={ft} onPress={() => setFitType(ft)} style={[styles.chipItem, fitType === ft && styles.chipItemActive]}>
                          <Text style={[styles.chipText, fitType === ft && styles.chipTextActive]}>{ft}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Season */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Season / Occasion</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('SEASON')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Season</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {seasonsList.map((s) => (
                        <TouchableOpacity key={s} onPress={() => setSeason(s)} style={[styles.chipItem, season === s && styles.chipItemActive]}>
                          <Text style={[styles.chipText, season === s && styles.chipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Sizes */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Available Sizes (Tap to Toggle)</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('SIZE')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Size</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {sizesList.map((sz) => {
                        const active = selectedSizes.includes(sz);
                        return (
                          <TouchableOpacity key={sz} onPress={() => handleToggleSize(sz)} style={[styles.sizeChip, active && styles.sizeChipActive]}>
                            <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>{sz}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {activeCommunity === 'hardware' && (
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.specCardTitle}>🔧 Hardware & Tools Specifications</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('HARDWARE_MATERIAL')}>
                        <Text style={styles.requestLink}>+ Custom Spec</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Material */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Material Grade / Alloy</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('HARDWARE_MATERIAL')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Material</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {hardwareMaterials.map((m) => (
                        <TouchableOpacity key={m} onPress={() => setHwMaterial(m)} style={[styles.chipItem, hwMaterial === m && styles.chipItemActive]}>
                          <Text style={[styles.chipText, hwMaterial === m && styles.chipTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Warranty */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Warranty / Guarantee</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('HARDWARE_WARRANTY')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Warranty</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {hardwareWarranties.map((w) => (
                        <TouchableOpacity key={w} onPress={() => setHwWarranty(w)} style={[styles.chipItem, hwWarranty === w && styles.chipItemActive]}>
                          <Text style={[styles.chipText, hwWarranty === w && styles.chipTextActive]}>{w}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Power Rating */}
                    <Text style={styles.subLabel}>Power Rating / Voltage</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {hardwarePowerRatings.map((p) => (
                        <TouchableOpacity key={p} onPress={() => setHwPower(p)} style={[styles.chipItem, hwPower === p && styles.chipItemActive]}>
                          <Text style={[styles.chipText, hwPower === p && styles.chipTextActive]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Surface Finish */}
                    <Text style={styles.subLabel}>Surface Finish & Coating</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {hardwareFinishes.map((fn) => (
                        <TouchableOpacity key={fn} onPress={() => setHwFinish(fn)} style={[styles.chipItem, hwFinish === fn && styles.chipItemActive]}>
                          <Text style={[styles.chipText, hwFinish === fn && styles.chipTextActive]}>{fn}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Application */}
                    <Text style={styles.subLabel}>Industrial Application</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {hardwareApplications.map((ap) => (
                        <TouchableOpacity key={ap} onPress={() => setHwApp(ap)} style={[styles.chipItem, hwApp === ap && styles.chipItemActive]}>
                          <Text style={[styles.chipText, hwApp === ap && styles.chipTextActive]}>{ap}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {activeCommunity === 'jewellery' && (
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.specCardTitle}>💎 Jewellery & Gem Specifications</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('JEWELLERY_PURITY')}>
                        <Text style={styles.requestLink}>+ Custom Spec</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gold Purity */}
                    <View style={styles.labelRow}>
                      <Text style={styles.subLabel}>Metal Purity / Karat</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('JEWELLERY_PURITY')}>
                        <Text style={styles.customBadgeBtn}>+ Custom Purity</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {jewelleryPurities.map((p) => (
                        <TouchableOpacity key={p} onPress={() => setJwlPurity(p)} style={[styles.chipItem, jwlPurity === p && styles.chipItemActive]}>
                          <Text style={[styles.chipText, jwlPurity === p && styles.chipTextActive]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Metal Weight Input */}
                    <Text style={styles.subLabel}>Approx Metal Weight (e.g. 10.5 Grams)</Text>
                    <TextInput
                      style={styles.input}
                      value={jwlWeight}
                      onChangeText={setJwlWeight}
                      placeholder="e.g. 12.5 Grams"
                      placeholderTextColor="#64748b"
                    />

                    {/* Gemstone Type */}
                    <Text style={styles.subLabel}>Gemstone / Diamond Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {jewelleryGemstones.map((g) => (
                        <TouchableOpacity key={g} onPress={() => setJwlGemstone(g)} style={[styles.chipItem, jwlGemstone === g && styles.chipItemActive]}>
                          <Text style={[styles.chipText, jwlGemstone === g && styles.chipTextActive]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Certification */}
                    <Text style={styles.subLabel}>Certification Standard</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {jewelleryCertifications.map((c) => (
                        <TouchableOpacity key={c} onPress={() => setJwlCert(c)} style={[styles.chipItem, jwlCert === c && styles.chipItemActive]}>
                          <Text style={[styles.chipText, jwlCert === c && styles.chipTextActive]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {activeCommunity === 'electronics' && (
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.specCardTitle}>⚡ Electronics Specifications</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('ELEC_POWER')}>
                        <Text style={styles.requestLink}>+ Custom Spec</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.subLabel}>Power Source / Input Voltage</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {electronicsPowerSources.map((ps) => (
                        <TouchableOpacity key={ps} onPress={() => setElecPower(ps)} style={[styles.chipItem, elecPower === ps && styles.chipItemActive]}>
                          <Text style={[styles.chipText, elecPower === ps && styles.chipTextActive]}>{ps}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.subLabel}>Connectivity Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {electronicsConnectivities.map((cn) => (
                        <TouchableOpacity key={cn} onPress={() => setElecConn(cn)} style={[styles.chipItem, elecConn === cn && styles.chipItemActive]}>
                          <Text style={[styles.chipText, elecConn === cn && styles.chipTextActive]}>{cn}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.subLabel}>Warranty Period</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {electronicsWarranties.map((ew) => (
                        <TouchableOpacity key={ew} onPress={() => setElecWarranty(ew)} style={[styles.chipItem, elecWarranty === ew && styles.chipItemActive]}>
                          <Text style={[styles.chipText, elecWarranty === ew && styles.chipTextActive]}>{ew}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {activeCommunity === 'grocery' && (
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.specCardTitle}>🌾 Grocery & FMCG Specifications</Text>
                      <TouchableOpacity onPress={() => handleOpenRequestModal('GROCERY_PACK')}>
                        <Text style={styles.requestLink}>+ Custom Spec</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.subLabel}>Packaging Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {groceryPackagings.map((gp) => (
                        <TouchableOpacity key={gp} onPress={() => setGrocPack(gp)} style={[styles.chipItem, grocPack === gp && styles.chipItemActive]}>
                          <Text style={[styles.chipText, grocPack === gp && styles.chipTextActive]}>{gp}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.subLabel}>Shelf Life</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {groceryShelfLives.map((gs) => (
                        <TouchableOpacity key={gs} onPress={() => setGrocShelf(gs)} style={[styles.chipItem, grocShelf === gs && styles.chipItemActive]}>
                          <Text style={[styles.chipText, grocShelf === gs && styles.chipTextActive]}>{gs}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.subLabel}>FSSAI & Certification</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {groceryCertifications.map((gc) => (
                        <TouchableOpacity key={gc} onPress={() => setGrocCert(gc)} style={[styles.chipItem, grocCert === gc && styles.chipItemActive]}>
                          <Text style={[styles.chipText, grocCert === gc && styles.chipTextActive]}>{gc}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* 4. UNIVERSAL CUSTOM SPECIFICATION KEY-VALUE BUILDER */}
                <View style={[styles.labelRow, { marginTop: 14, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 10 }]}>
                  <Text style={styles.subLabel}>➕ Additional Custom Specifications</Text>
                  <TouchableOpacity onPress={handleAddCustomSpecRow} style={styles.addTierBtn}>
                    <Text style={styles.addTierBtnText}>+ Add Key/Value</Text>
                  </TouchableOpacity>
                </View>

                {customSpecRows.map((row, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, height: 36, marginBottom: 0 }]}
                      placeholder="Spec Name (e.g. Voltage)"
                      placeholderTextColor="#64748b"
                      value={row.key}
                      onChangeText={(val) => {
                        const updated = [...customSpecRows];
                        updated[idx].key = val;
                        setCustomSpecRows(updated);
                      }}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, height: 36, marginBottom: 0 }]}
                      placeholder="Value (e.g. 220V)"
                      placeholderTextColor="#64748b"
                      value={row.value}
                      onChangeText={(val) => {
                        const updated = [...customSpecRows];
                        updated[idx].value = val;
                        setCustomSpecRows(updated);
                      }}
                    />
                    <TouchableOpacity onPress={() => handleRemoveCustomSpecRow(idx)} style={{ justifyContent: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
                  <Text style={styles.specCardTitle}>💰 Wholesale Bulk Price Tiers (₹ / Unit)</Text>
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
                    <Text style={styles.tierSuffix}>+ units @ ₹</Text>
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
                  disabled={isCreating || isUpdating || isUploadingMedia}
                  style={[styles.submitBtn, (isCreating || isUpdating || isUploadingMedia) && { opacity: 0.5 }]}
                >
                  {isCreating || isUpdating || isUploadingMedia ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isEditing ? '💾 Save & Update Product ➔' : '🚀 Upload & Publish Product ➔'}
                    </Text>
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
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  lockedBox: {
    padding: 30,
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 40,
  },
  lockBadgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockedTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  lockedSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
  },
  userInfoBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  infoVal: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusAmber: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
  },
  verifiedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 'bold',
  },
  approvedTag: {
    fontSize: 8,
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
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadProgressText: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  commTab: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commTabActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  commTabText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  commTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestLink: {
    fontSize: 10,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  chipItem: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  chipItemActive: {
    backgroundColor: '#4f46e5',
  },
  chipText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  specCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginVertical: 8,
  },
  specCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#818cf8',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginVertical: 4,
  },
  customBadgeBtn: {
    fontSize: 9,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  sizeChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sizeChipActive: {
    backgroundColor: '#10b981',
  },
  sizeChipText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  sizeChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  hotSellingCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 12,
    borderRadius: 14,
    marginVertical: 8,
  },
  hotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hotTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
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
    marginVertical: 8,
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
