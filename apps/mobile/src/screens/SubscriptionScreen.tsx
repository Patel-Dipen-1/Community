import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useGetSubscriptionQuery, useSubmitPaymentProofMutation } from '../store/api/subscriptionApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

export const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const { data, isLoading } = useGetSubscriptionQuery();
  const [submitPayment, { isLoading: isSubmitting }] = useSubmitPaymentProofMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  const handlePickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!screenshotUri && !txRef.trim()) {
      Alert.alert('Proof Required', 'Please enter UPI transaction reference or upload screenshot.');
      return;
    }

    try {
      await submitPayment({
        screenshotUrl: screenshotUri || 'https://via.placeholder.com/400x600.png?text=Payment+Proof',
        transactionRef: txRef.trim() || undefined,
      }).unwrap();

      Alert.alert('Payment Proof Submitted', 'Your payment receipt is under review by Super Admin.');
      setModalVisible(false);
      setTxRef('');
      setScreenshotUri(null);
    } catch (err: any) {
      Alert.alert('Submission Error', err?.data?.error || 'Failed to submit payment proof.');
    }
  };

  const sub = data?.subscription;

  return (
    <View style={styles.container}>
      <Header title="Subscriptions & Billing" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.cardHeader}>CURRENT MEMBERSHIP STATUS</Text>
          <Text style={styles.planTitle}>{sub?.planName || 'Enterprise Pro Plan'}</Text>
          <View style={styles.badgeRow}>
            <Text style={sub?.status === 'ACTIVE' ? styles.activeBadge : styles.trialBadge}>
              ● {sub?.status || 'TRIAL PERIOD'}
            </Text>
          </View>
          <Text style={styles.periodText}>
            Trial Period Ends: {sub?.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString() : 'Active 14 Days'}
          </Text>
        </View>

        {/* Pricing Plan Info */}
        <View style={styles.planCard}>
          <Text style={styles.planHeader}>Enterprise Membership • ₹4,999 / Year</Text>
          <Text style={styles.featBullet}>✓ Unlimited Verified SKU Catalog Uploads</Text>
          <Text style={styles.featBullet}>✓ WhatsApp Broadcast Lists & Direct Messages</Text>
          <Text style={styles.featBullet}>✓ 5-Session Concurrent Business Login Limit</Text>
          <Text style={styles.featBullet}>✓ Category Specification Isolation & Support</Text>

          <Button
            title="Submit UPI / Bank Payment Proof"
            onPress={() => setModalVisible(true)}
            style={{ marginTop: 16 }}
          />
        </View>

        {/* Transaction History */}
        <Text style={styles.secTitle}>Payment Transaction History</Text>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading payment transactions...</Text>
        ) : data?.transactions?.length === 0 ? (
          <Text style={styles.emptyText}>No previous payment records found.</Text>
        ) : (
          data?.transactions?.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View>
                <Text style={styles.txTitle}>{tx.cycleName}</Text>
                <Text style={styles.txInv}>Invoice #{tx.invoiceNumber}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.txAmount}>₹{tx.amount}</Text>
                <Text style={styles.txStatus}>{tx.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Submit Payment Proof Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Submit Payment Proof</Text>
            <Text style={styles.modalSub}>
              Pay via UPI / Bank Transfer and submit screenshot / UTR number for admin verification.
            </Text>

            <Input
              label="UPI Transaction Reference / UTR Number"
              placeholder="e.g. 326718901234"
              value={txRef}
              onChangeText={setTxRef}
            />

            <TouchableOpacity style={styles.uploadBox} onPress={handlePickScreenshot}>
              <Text style={styles.uploadText}>
                {screenshotUri ? '✓ Screenshot Selected' : '📷 Tap to upload payment screenshot'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Submit Proof" loading={isSubmitting} onPress={handleSubmitProof} style={{ flex: 1 }} />
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
  statusCard: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', padding: 16, marginBottom: 14 },
  cardHeader: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  planTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  badgeRow: { marginTop: 6 },
  activeBadge: { color: '#34d399', fontSize: 12, fontWeight: '800' },
  trialBadge: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
  periodText: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  planCard: { backgroundColor: '#1e1b4b', borderRadius: 16, borderWidth: 1, borderColor: '#4338ca', padding: 16, marginBottom: 16 },
  planHeader: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  featBullet: { color: '#cbd5e1', fontSize: 12, marginBottom: 4 },
  secTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  loadingText: { color: '#94a3b8' },
  emptyText: { color: '#64748b', fontStyle: 'italic' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 8 },
  txTitle: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  txInv: { color: '#64748b', fontSize: 11, marginTop: 2 },
  txAmount: { color: '#34d399', fontSize: 14, fontWeight: '900' },
  txStatus: { color: '#818cf8', fontSize: 10, fontWeight: '800', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  uploadBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
  uploadText: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10 },
});
