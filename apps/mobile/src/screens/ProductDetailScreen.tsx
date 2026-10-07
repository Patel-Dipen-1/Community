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
import { Header, Input, Button, PageTitle, SectionTitle, MutedText, BodyText } from '../components/common';
import { colors, spacing, borderRadius } from '../theme/theme';
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
          <MutedText style={styles.loadingText}>Loading product details...</MutedText>
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

          <PageTitle style={styles.title}>{product.title}</PageTitle>
          <Text style={styles.price}>₹{product.priceTiers?.[0]?.price} / Piece</Text>
          <MutedText style={styles.moqText}>Minimum Order Quantity (MOQ): {product.moq} Pcs</MutedText>

          {/* Pricing Tiers Table */}
          <View style={styles.tiersCard}>
            <Text style={styles.tiersTitle}>Bulk Tier Pricing</Text>
            {product.priceTiers?.map((tier, idx) => (
              <View key={idx} style={styles.tierRow}>
                <BodyText style={styles.tierQty}>Qty {tier.minQty}+ Pcs</BodyText>
                <Text style={styles.tierPrice}>₹{tier.price} / pc</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <SectionTitle style={styles.secTitle}>Product Description</SectionTitle>
          <BodyText style={styles.description}>{product.description}</BodyText>

          {/* Vendor Details */}
          {product.business && (
            <View style={styles.vendorCard}>
              <MutedText style={styles.vendorHeader}>Verified Supplier Store</MutedText>
              <Text style={styles.vendorName}>{product.business.shopName}</Text>
              <MutedText style={styles.vendorLoc}>📍 {product.business.city}, {product.business.state}</MutedText>
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
            <SectionTitle style={styles.modalTitle}>📩 Send Wholesale Inquiry</SectionTitle>
            <MutedText style={styles.modalSub}>Direct inquiry dispatch to verified supplier.</MutedText>

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
  container: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted },
  scrollContent: { paddingBottom: 80 },
  mainImage: { width: '100%', height: 260, backgroundColor: colors.surfaceLight },
  contentBox: { padding: spacing.lg },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  skuBadge: { color: colors.primaryLight, fontSize: 11, fontWeight: '900', backgroundColor: colors.card, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: colors.borderLight },
  hotBadge: { color: colors.textMain, fontSize: 10, fontWeight: '800', backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.xs },
  title: { fontSize: 20, marginBottom: spacing.xs },
  price: { color: colors.accentLight, fontSize: 22, fontWeight: '900', marginBottom: 2 },
  moqText: { fontSize: 13, marginBottom: spacing.lg },
  tiersCard: { backgroundColor: colors.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg },
  tiersTitle: { color: colors.primaryLight, fontSize: 13, fontWeight: '800', marginBottom: spacing.sm },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tierQty: { fontSize: 12 },
  tierPrice: { color: colors.accentLight, fontSize: 12, fontWeight: '800' },
  secTitle: { marginBottom: spacing.xs },
  description: { fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  vendorCard: { backgroundColor: colors.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  vendorHeader: { fontSize: 11, fontWeight: '700' },
  vendorName: { color: colors.textMain, fontSize: 16, fontWeight: '800', marginTop: 2 },
  vendorLoc: { fontSize: 12, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  inquireBtn: { flex: 1, backgroundColor: colors.surfaceLight, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  inquireBtnText: { color: colors.textLight, fontSize: 13, fontWeight: '700' },
  chatBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  chatBtnText: { color: colors.textMain, fontSize: 13, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderLight },
  modalTitle: { fontSize: 18, marginBottom: spacing.xs },
  modalSub: { fontSize: 12, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

