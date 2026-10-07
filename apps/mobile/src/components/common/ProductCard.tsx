import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { ProductItem } from '../../store/api/productApi';
import { colors, typography, borderRadius, spacing } from '../../theme/theme';

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
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hotBadge: {
    position: 'absolute',
    top: spacing.sm + 2,
    left: spacing.sm + 2,
    backgroundColor: 'rgba(225, 29, 72, 0.9)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  hotBadgeText: {
    color: colors.textMain,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  skuTag: {
    position: 'absolute',
    bottom: spacing.sm + 2,
    right: spacing.sm + 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skuText: {
    color: colors.primaryLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  body: {
    padding: spacing.md + 2,
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.lg - 1,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  price: {
    color: colors.successLight,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
  },
  moq: {
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  vendorName: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  verifiedTag: {
    color: colors.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.xs + 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquireBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inquireBtnText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  chatBtn: {
    backgroundColor: colors.primary,
  },
  chatBtnText: {
    color: colors.textMain,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
