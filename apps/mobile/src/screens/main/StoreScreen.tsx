import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';

export const StoreScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>🏪 B2B Showrooms & Product Catalog</Text>

      <Card>
        <Text style={styles.cardTitle}>Cotton Printed Kurti Collection</Text>
        <Text style={styles.skuBadge}>SKU-CLOTH-001</Text>
        <Text style={styles.price}>₹350 / pc • MOQ 50 Pcs</Text>
        <Text style={styles.vendor}>Supplier: Royal Textiles (Surat, Gujarat)</Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  skuBadge: { color: '#818cf8', fontSize: 11, fontWeight: '800', marginTop: 4 },
  price: { color: '#34d399', fontSize: 13, fontWeight: '800', marginTop: 4 },
  vendor: { color: '#94a3b8', fontSize: 11, marginTop: 6 },
});
