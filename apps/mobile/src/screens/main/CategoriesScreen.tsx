import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';

const COMMUNITIES = [
  { id: 'clothing', name: 'Clothing & Textiles', icon: '👕' },
  { id: 'jewellery', name: 'Jewellery & Gems', icon: '💎' },
  { id: 'electronics', name: 'Electronics & Mobiles', icon: '📱' },
  { id: 'footwear', name: 'Footwear & Leather', icon: '👟' },
  { id: 'textiles', name: 'Textiles & Yarns', icon: '🧵' },
  { id: 'cosmetics', name: 'Cosmetics & Beauty', icon: '💄' },
  { id: 'hardware', name: 'Hardware & Tools', icon: '🔧' },
  { id: 'food', name: 'Food & Spices', icon: '🌾' },
  { id: 'handicrafts', name: 'Handicrafts & Decor', icon: '🎨' },
];

export const CategoriesScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>🏷️ Trade Communities & Categories</Text>

      {COMMUNITIES.map((c) => (
        <Card key={c.id} style={styles.card}>
          <Text style={styles.icon}>{c.icon}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.slug}>slug: {c.id}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  icon: { fontSize: 28, marginRight: 16 },
  info: { flex: 1 },
  name: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  slug: { color: '#34d399', fontSize: 11, fontWeight: '700', marginTop: 2 },
});
