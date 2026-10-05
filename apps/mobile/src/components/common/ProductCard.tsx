import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { ProductItem } from '../../store/api/productApi';

interface ProductCardProps {
  product: ProductItem;
  onPress?: () => void;
  onInquire?: () => void;
  onChatSeller?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onInquire,
  onChatSeller,
}) => {
  const primaryImage = product.images?.[0] || 'https://via.placeholder.com/300x300.png?text=B2B+Product';
  const firstPrice = product.priceTiers?.[0]?.price || 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="cover" />
        {product.isHotSelling && (
          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeText}>🔥 Hot Selling</Text>
          </View>
        )}
        <View style={styles.skuTag}>
          <Text style={styles.skuText}>{product.code}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{firstPrice.toLocaleString('en-IN')}</Text>
          <Text style={styles.moq}>MOQ: {product.moq} Pcs</Text>
        </View>

        {product.business && (
          <View style={styles.vendorRow}>
            <Text style={styles.vendorName} numberOfLines={1}>
              🏪 {product.business.shopName}
            </Text>
            {product.business.verificationTag && <Text style={styles.verifiedTag}>✓ Verified</Text>}
          </View>
        )}

        <View style={styles.actionsRow}>
          {onInquire && (
            <TouchableOpacity style={[styles.actionBtn, styles.inquireBtn]} onPress={onInquire} activeOpacity={0.8}>
              <Text style={styles.inquireBtnText}>📩 Inquire</Text>
            </TouchableOpacity>
          )}
          {onChatSeller && (
            <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={onChatSeller} activeOpacity={0.8}>
              <Text style={styles.chatBtnText}>💬 Chat Seller</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hotBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(225, 29, 72, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hotBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  skuTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  skuText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  body: {
    padding: 14,
  },
  title: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  price: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '900',
  },
  moq: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginBottom: 12,
  },
  vendorName: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  verifiedTag: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquireBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inquireBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  chatBtn: {
    backgroundColor: '#4f46e5',
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
