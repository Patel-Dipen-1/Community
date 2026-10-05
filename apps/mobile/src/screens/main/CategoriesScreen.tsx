import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Categories'>;

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('clothing');
  const [modalVisible, setModalVisible] = useState(false);
  const [requestValue, setRequestValue] = useState('');

  const categories = [
    {
      id: 'clothing',
      name: '👕 Clothing & Textiles',
      slug: 'clothing',
      specs: ['Fabric', 'GSM Weight', 'Size Tiers', 'Gender', 'Pattern'],
      subcategories: ['Shirts', 'Jeans', 'Kurtis', 'Sarees', 'Tracksuits'],
    },
    {
      id: 'jewellery',
      name: '💎 Gold & Jewellery',
      slug: 'jewellery',
      specs: ['Purity Karat', 'Certification Tag', 'Weight Grams', 'Type'],
      subcategories: ['1 Gram Gold', 'Original Gold', 'Silver Ornaments', 'Imitation'],
    },
    {
      id: 'electronics',
      name: '⚡ Electronics & Gadgets',
      slug: 'electronics',
      specs: ['Warranty Months', 'Voltage Rating', 'Brand SKU'],
      subcategories: ['Smartphones', 'Audio Gear', 'Power Banks', 'Accessories'],
    },
    {
      id: 'hardware',
      name: '🔧 Hardware & Tools',
      slug: 'hardware',
      specs: ['Material Grade', 'Dimension MM', 'MOQ Units'],
      subcategories: ['Fasteners', 'Power Tools', 'Safety Gear', 'Pipes'],
    },
  ];

  const activeCatObj = categories.find((c) => c.slug === selectedCategory) || categories[0];

  return (
    <View style={styles.container}>
      <Header
        title="Trade Categories & Specs"
        subtitle="Multi-Community Category Authorization"
        rightElement={
          <TouchableOpacity style={styles.reqBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.reqBtnText}>+ Request Attribute</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category Selection Grid */}
        <View style={styles.catGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, isSelected && styles.catCardSelected]}
                onPress={() => setSelectedCategory(cat.slug)}
              >
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.subcategories.length} Subcategories</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Category Breakdown */}
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
      </ScrollView>

      {/* Attribute Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request New Category Attribute</Text>
            <Text style={styles.modalSub}>
              Propose a missing fabric, size tier, or specification to Super Admin.
            </Text>

            <Input
              label="Attribute Name / Value"
              placeholder="e.g. Organic Bamboo Fabric"
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
