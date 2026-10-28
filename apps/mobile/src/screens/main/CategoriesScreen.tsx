import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useRedux';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Categories'>;

const ALL_MASTER_CATEGORIES = [
  {
    id: 'clothing',
    name: '👕 Clothing & Textiles',
    slug: 'clothing',
    specs: ['Fabric', 'GSM Weight', 'Size Tiers', 'Gender', 'Pattern'],
    subcategories: ['Shirts', 'Jeans', 'Kurtis', 'Sarees', 'Tracksuits'],
  },
  {
    id: 'hardware',
    name: '🔧 Hardware & Tools',
    slug: 'hardware',
    specs: ['Material Grade', 'Dimension MM', 'MOQ Units', 'Coating Finish'],
    subcategories: ['Fasteners', 'Power Tools', 'Safety Gear', 'Pipes', 'Valves'],
  },
  {
    id: 'electronics',
    name: '⚡ Electronics & Gadgets',
    slug: 'electronics',
    specs: ['Warranty Months', 'Voltage Rating', 'Brand SKU', 'Port Type'],
    subcategories: ['Smartphones', 'Audio Gear', 'Power Banks', 'Accessories', 'Chargers'],
  },
  {
    id: 'grocery',
    name: '🌾 Grocery & FMCG',
    slug: 'grocery',
    specs: ['Packaging Type', 'Origin Estate', 'Grade Quality', 'Shelf Life'],
    subcategories: ['Spices', 'Grains & Pulses', 'Dry Fruits', 'Edible Oils'],
  },
  {
    id: 'jewellery',
    name: '💎 Gold & Jewellery',
    slug: 'jewellery',
    specs: ['Purity Karat', 'Certification Tag', 'Weight Grams', 'Type'],
    subcategories: ['1 Gram Gold', 'Original Gold', 'Silver Ornaments', 'Imitation'],
  },
];

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);

  const isSuperAdmin = Boolean(
    (user as any)?.role === 'SUPER_ADMIN' ||
    user?.email === 'dnpatel2002@gmail.com' ||
    (user as any)?.assignedRole === 'SUPER_ADMIN' ||
    user?.business?.assignedRole === 'SUPER_ADMIN'
  );

  const allowedSlugs: string[] = isSuperAdmin
    ? ['clothing', 'hardware', 'electronics', 'grocery', 'jewellery']
    : (user?.business?.allowedCommunities && user.business.allowedCommunities.length > 0)
    ? user.business.allowedCommunities.map((c) => c.toLowerCase())
    : ['clothing'];

  const categories = ALL_MASTER_CATEGORIES.filter((cat) => allowedSlugs.includes(cat.slug));

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0]?.slug || 'hardware'
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [requestValue, setRequestValue] = useState('');

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.slug === selectedCategory)) {
      setSelectedCategory(categories[0].slug);
    }
  }, [allowedSlugs.join(','), selectedCategory]);

  const activeCatObj = categories.find((c) => c.slug === selectedCategory) || categories[0] || ALL_MASTER_CATEGORIES[0];

  return (
    <View style={styles.container}>
      <Header
        title="Categories & Specs"
        subtitle="Trade Attributes & Standards"
        rightElement={
          <TouchableOpacity style={styles.reqBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.reqBtnText}>+ Request</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category Selection Grid - Only showing user's permitted categories */}
        <View style={styles.catGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, isSelected && styles.catCardSelected]}
                onPress={() => setSelectedCategory(cat.slug)}
                activeOpacity={0.8}
              >
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.subcategories.length} Subcategories</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Category Breakdown */}
        {activeCatObj && (
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>{activeCatObj.name} Specifications</Text>

            <Text style={styles.subLabel}>Supported Subcategories:</Text>
            <View style={styles.tagWrap}>
              {activeCatObj.subcategories.map((sub) => (
                <View key={sub} style={styles.subTag}>
                  <Text style={styles.subTagText}>{sub}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: 14 }]}>Server-Side Specification Attributes:</Text>
            {activeCatObj.specs.map((spec) => (
              <View key={spec} style={styles.specRow}>
                <Text style={styles.specBullet}>🔹</Text>
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Attribute Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request New Category Attribute</Text>
            <Text style={styles.modalSub}>
              Propose a missing specification attribute for your verified business sector.
            </Text>

            <Input
              label="Attribute Name / Value"
              placeholder="e.g. Metric Thread Pitch (ISO 965)"
              value={requestValue}
              onChangeText={setRequestValue}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Request"
                onPress={() => {
                  setModalVisible(false);
                  setRequestValue('');
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },
  reqBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reqBtnText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  catCard: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  catCardSelected: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
  catName: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  catCount: { color: '#94a3b8', fontSize: 11 },
  detailBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  detailTitle: { color: '#818cf8', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  subLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  subTagText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  specRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  specBullet: { fontSize: 12, marginRight: 8 },
  specText: { color: '#cbd5e1', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
