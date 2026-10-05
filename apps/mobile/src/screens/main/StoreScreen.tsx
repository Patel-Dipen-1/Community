import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ProductCard } from '../../components/common/ProductCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useGetMyStoreQuery } from '../../store/api/storeApi';
import { useCreateProductMutation } from '../../store/api/productApi';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Store'>;

export const StoreScreen: React.FC<Props> = ({ navigation }) => {
  const { data: storeData, isLoading, refetch } = useGetMyStoreQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [moq, setMoq] = useState('10');
  const [price, setPrice] = useState('500');

  const handleCreateProduct = async () => {
    if (!title.trim() || !code.trim() || !price.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Title, SKU Code, and Price.');
      return;
    }

    try {
      await createProduct({
        title: title.trim(),
        code: code.trim(),
        description: description.trim() || title.trim(),
        moq: parseInt(moq, 10) || 1,
        priceTiers: [{ minQty: parseInt(moq, 10) || 1, price: parseFloat(price) || 100 }],
        images: ['https://via.placeholder.com/400x400.png?text=B2B+Product'],
        specs: { Category: 'General Wholesale' },
        communityId: storeData?.store?.business?.allowedCommunities?.[0] || 'clothing',
        categoryId: 'cat-default',
      }).unwrap();

      Alert.alert('Success', `Product ${code} listed successfully!`);
      setModalVisible(false);
      setTitle('');
      setCode('');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.data?.error || 'Failed to list product.');
    }
  };

  const store = storeData?.store;
  const products = store?.products || [];

  return (
    <View style={styles.container}>
      <Header
        title={store?.name || 'B2B Showroom'}
        subtitle={`Wholesale Catalog • SKU Deduplicated`}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Store Profile Banner Header */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: store?.bannerUrl || 'https://via.placeholder.com/600x200.png?text=Wholesale+Showroom',
            }}
            style={styles.bannerImage}
          />
          <View style={styles.storeOverlay}>
            <Image
              source={{
                uri: store?.logoUrl || 'https://via.placeholder.com/100?text=Logo',
              }}
              style={styles.storeLogo}
            />
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store?.name || 'Royal Wholesale Store'}</Text>
              <Text style={styles.storeLoc}>
                📍 {store?.business?.city || 'Surat'}, {store?.business?.state || 'Gujarat'}
              </Text>
              {store?.business?.verificationTag && (
                <Text style={styles.verifiedBadge}>✓ Super Admin Verified Vendor</Text>
              )}
            </View>
          </View>
        </View>

        {/* Bio Card */}
        <View style={styles.bioCard}>
          <Text style={styles.bioTitle}>About Store</Text>
          <Text style={styles.bioText}>
            {store?.bio || 'Leading wholesale manufacturer & distributor serving verified B2B buyers across India.'}
          </Text>
        </View>

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📦 Catalog Products ({products.length})</Text>
        </View>

        {isLoading ? (
          <Text style={styles.loadingText}>Loading store catalog...</Text>
        ) : products.length === 0 ? (
          <EmptyState
            icon="🏪"
            title="No Listed Products"
            description="Your store catalog currently has no products listed. Click '+ Add Product' to showcase your inventory."
            actionTitle="+ Add First Product"
            onAction={() => setModalVisible(true)}
          />
        ) : (
          products.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          ))
        )}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>📦 List New SKU Product</Text>
              <Text style={styles.modalSub}>
                Unique SKU code eliminates duplicate media uploads and saves server storage.
              </Text>

              <Input label="Product Title *" placeholder="e.g. Cotton Printed Kurti" value={title} onChangeText={setTitle} />
              <Input label="Unique SKU Code *" placeholder="e.g. SKU-CLOTH-901" value={code} onChangeText={setCode} />
              <Input label="Price (₹) *" placeholder="e.g. 350" keyboardType="numeric" value={price} onChangeText={setPrice} />
              <Input label="Minimum Order Quantity (MOQ) *" placeholder="e.g. 20" keyboardType="numeric" value={moq} onChangeText={setMoq} />
              <Input label="Description / Specification" placeholder="Describe fabric, sizes, terms..." value={description} onChangeText={setDescription} multiline numberOfLines={3} />

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
                <Button title="List Product" loading={isCreating} onPress={handleCreateProduct} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },
  addBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  bannerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  bannerImage: { width: '100%', height: 120 },
  storeOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0f172a',
  },
  storeLogo: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e293b', marginRight: 12 },
  storeInfo: { flex: 1 },
  storeName: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  storeLoc: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  verifiedBadge: { color: '#38bdf8', fontSize: 10, fontWeight: '800', marginTop: 2 },
  bioCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 16,
  },
  bioTitle: { color: '#818cf8', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  bioText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  loadingText: { color: '#94a3b8', textAlign: 'center', marginVertical: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center' },
  modalScroll: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
