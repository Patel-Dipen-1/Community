import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useGetProductByIdQuery } from '../store/api/productApi';
import { useSendInquiryMutation } from '../store/api/inquiryApi';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const { data, isLoading } = useGetProductByIdQuery(productId);
  const [sendInquiry, { isLoading: isSendingInquiry }] = useSendInquiryMutation();

  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [quantity, setQuantity] = useState('50');
  const [targetPrice, setTargetPrice] = useState('');
  const [message, setMessage] = useState('');

  const product = data?.product;

  const handleSendInquiry = async () => {
    if (!product) return;
    try {
      await sendInquiry({
        receiverId: product.businessId,
        productId: product.id,
        quantity: parseInt(quantity, 10) || product.moq,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        message: message.trim() || 'Requesting catalog quote for bulk order.',
      }).unwrap();

      Alert.alert('Inquiry Sent', 'Your lead inquiry has been dispatched to the vendor.');
      setInquiryModalVisible(false);
    } catch (err: any) {
      Alert.alert('Inquiry Error', err?.data?.error || 'Failed to submit inquiry.');
    }
  };

  if (isLoading || !product) {
    return (
      <View style={styles.container}>
        <Header title="Product Specs" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </View>
    );
  }

  const primaryImage = product.images?.[0] || 'https://via.placeholder.com/400x400.png?text=Wholesale+Item';

  return (
    <View style={styles.container}>
      <Header title={product.code} subtitle={product.title} showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: primaryImage }} style={styles.mainImage} resizeMode="cover" />

        <View style={styles.contentBox}>
          <View style={styles.badgeRow}>
            <Text style={styles.skuBadge}>SKU: {product.code}</Text>
            {product.isHotSelling && <Text style={styles.hotBadge}>🔥 Hot Selling</Text>}
          </View>

          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>₹{product.priceTiers?.[0]?.price} / Piece</Text>
          <Text style={styles.moqText}>Minimum Order Quantity (MOQ): {product.moq} Pcs</Text>

          {/* Pricing Tiers Table */}
          <View style={styles.tiersCard}>
            <Text style={styles.tiersTitle}>Bulk Tier Pricing</Text>
            {product.priceTiers?.map((tier, idx) => (
              <View key={idx} style={styles.tierRow}>
                <Text style={styles.tierQty}>Qty {tier.minQty}+ Pcs</Text>
                <Text style={styles.tierPrice}>₹{tier.price} / pc</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.secTitle}>Product Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Vendor Details */}
          {product.business && (
            <View style={styles.vendorCard}>
              <Text style={styles.vendorHeader}>Verified Supplier Store</Text>
              <Text style={styles.vendorName}>{product.business.shopName}</Text>
              <Text style={styles.vendorLoc}>📍 {product.business.city}, {product.business.state}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action CTAs */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.inquireBtn} onPress={() => setInquiryModalVisible(true)}>
          <Text style={styles.inquireBtnText}>📩 Inquire Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => {
            if (product.business?.id) {
              navigation.navigate('ChatDetail', {
                conversationId: '',
                recipientId: product.business.id,
                recipientName: product.business.shopName,
              });
            }
          }}
        >
          <Text style={styles.chatBtnText}>💬 Direct Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Modal */}
      <Modal visible={inquiryModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📩 Send Wholesale Inquiry</Text>
            <Text style={styles.modalSub}>Direct inquiry dispatch to verified supplier.</Text>

            <Input label="Target Quantity *" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            <Input label="Target Price (₹ per unit)" keyboardType="numeric" placeholder="Optional expected rate" value={targetPrice} onChangeText={setTargetPrice} />
            <Input label="Message / Requirements" placeholder="Specify colors, delivery date, terms..." value={message} onChangeText={setMessage} multiline numberOfLines={3} />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setInquiryModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Submit Inquiry" loading={isSendingInquiry} onPress={handleSendInquiry} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8' },
  scrollContent: { paddingBottom: 80 },
  mainImage: { width: '100%', height: 260, backgroundColor: '#1e293b' },
  contentBox: { padding: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  skuBadge: { color: '#818cf8', fontSize: 11, fontWeight: '900', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  hotBadge: { color: '#ffffff', fontSize: 10, fontWeight: '800', backgroundColor: '#e11d48', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  price: { color: '#34d399', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  moqText: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  tiersCard: { backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b', padding: 14, marginBottom: 16 },
  tiersTitle: { color: '#818cf8', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tierQty: { color: '#cbd5e1', fontSize: 12 },
  tierPrice: { color: '#34d399', fontSize: 12, fontWeight: '800' },
  secTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  description: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  vendorCard: { backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b', padding: 14 },
  vendorHeader: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  vendorName: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  vendorLoc: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  inquireBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  inquireBtnText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  chatBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  chatBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
