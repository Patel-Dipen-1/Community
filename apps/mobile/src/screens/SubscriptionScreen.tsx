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
import { Header, Input, Button, PageTitle, SectionTitle, MutedText, BodyText } from '../components/common';
import { colors, spacing, borderRadius } from '../theme/theme';
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
          <PageTitle style={styles.planTitle}>{sub?.planName || 'Enterprise Pro Plan'}</PageTitle>
          <View style={styles.badgeRow}>
            <Text style={sub?.status === 'ACTIVE' ? styles.activeBadge : styles.trialBadge}>
              ● {sub?.status || 'TRIAL PERIOD'}
            </Text>
          </View>
          <MutedText style={styles.periodText}>
            Trial Period Ends: {sub?.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString() : 'Active 14 Days'}
          </MutedText>
        </View>

        {/* Pricing Plan Info */}
        <View style={styles.planCard}>
          <Text style={styles.planHeader}>Enterprise Membership • ₹4,999 / Year</Text>
          <BodyText style={styles.featBullet}>✓ Unlimited Verified SKU Catalog Uploads</BodyText>
          <BodyText style={styles.featBullet}>✓ WhatsApp Broadcast Lists & Direct Messages</BodyText>
          <BodyText style={styles.featBullet}>✓ 5-Session Concurrent Business Login Limit</BodyText>
          <BodyText style={styles.featBullet}>✓ Category Specification Isolation & Support</BodyText>

          <Button
            title="Submit UPI / Bank Payment Proof"
            onPress={() => setModalVisible(true)}
            style={{ marginTop: spacing.lg }}
          />
        </View>

        {/* Transaction History */}
        <SectionTitle style={styles.secTitle}>Payment Transaction History</SectionTitle>
        {isLoading ? (
          <MutedText style={styles.loadingText}>Loading payment transactions...</MutedText>
        ) : data?.transactions?.length === 0 ? (
          <MutedText style={styles.emptyText}>No previous payment records found.</MutedText>
        ) : (
          data?.transactions?.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View>
                <BodyText style={styles.txTitle}>{tx.cycleName}</BodyText>
                <MutedText style={styles.txInv}>Invoice #{tx.invoiceNumber}</MutedText>
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
            <SectionTitle style={styles.modalTitle}>💳 Submit Payment Proof</SectionTitle>
            <MutedText style={styles.modalSub}>
              Pay via UPI / Bank Transfer and submit screenshot / UTR number for admin verification.
            </MutedText>

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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  statusCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { color: colors.textSubtle, fontSize: 10, fontWeight: '800' },
  planTitle: { fontSize: 20, marginTop: spacing.xs },
  badgeRow: { marginTop: spacing.xs },
  activeBadge: { color: colors.accentLight, fontSize: 12, fontWeight: '800' },
  trialBadge: { color: colors.warningLight, fontSize: 12, fontWeight: '800' },
  periodText: { fontSize: 12, marginTop: spacing.sm },
  planCard: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary, padding: spacing.lg, marginBottom: spacing.lg },
  planHeader: { color: colors.textMain, fontSize: 16, fontWeight: '900', marginBottom: spacing.sm },
  featBullet: { fontSize: 12, marginBottom: spacing.xs },
  secTitle: { marginBottom: spacing.sm },
  loadingText: { fontStyle: 'italic' },
  emptyText: { fontStyle: 'italic' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  txTitle: { fontSize: 13, fontWeight: '700' },
  txInv: { fontSize: 11, marginTop: 2 },
  txAmount: { color: colors.accentLight, fontSize: 14, fontWeight: '900' },
  txStatus: { color: colors.primaryLight, fontSize: 10, fontWeight: '800', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderLight },
  modalTitle: { fontSize: 18, marginBottom: spacing.xs },
  modalSub: { fontSize: 12, marginBottom: spacing.lg },
  uploadBox: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed' },
  uploadText: { color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});

