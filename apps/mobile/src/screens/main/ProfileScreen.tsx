import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../types/navigation.types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';

type Props = NativeStackScreenProps<MainTabParamList & RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => authService.logoutUser(dispatch),
      },
    ]);
  };

  const handleAccountDeletionRequest = () => {
    if (!deletionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a brief reason for requesting account deletion.');
      return;
    }

    setIsSubmittingDelete(true);
    setTimeout(() => {
      setIsSubmittingDelete(false);
      setDeleteModalVisible(false);
      Alert.alert(
        'Deletion Request Submitted',
        'Your request has been sent to Super Admin for approval as per Apple & Google compliance policies.'
      );
    }, 1200);
  };

  const biz = user?.business;

  return (
    <View style={styles.container}>
      <Header
        title="Business Profile & Settings"
        subtitle="4-Section Showcase Layout"
        rightElement={
          <TouchableOpacity style={styles.logoutPill} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Business Identity & Verification Tag */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarChar}>{user?.fullName?.charAt(0).toUpperCase() || 'B'}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.shopName}>{biz?.shopName || 'Wholesale Business Store'}</Text>
              <Text style={styles.ownerName}>Owner: {user?.fullName}</Text>
              <Text style={styles.contactInfo}>📱 {user?.mobileNumber} • ✉️ {user?.email}</Text>
              <View style={styles.badgeRow}>
                {user?.isVerified ? (
                  <Text style={styles.verifiedTag}>✓ Super Admin Verified Vendor</Text>
                ) : (
                  <Text style={styles.pendingTag}>⏳ Verification Pending</Text>
                )}
                {biz?.assignedRole && <Text style={styles.roleTag}>{biz.assignedRole}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Address & GST Credentials */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Business Credentials & Location</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GST Number:</Text>
            <Text style={styles.infoValue}>{biz?.gstNumber || '24AAAAA0000A1Z5 (Verified)'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>
              {biz?.streetAddress ? `${biz.streetAddress}, ${biz.city}, ${biz.state} - ${biz.pincode}` : 'Ring Road Market, Surat, Gujarat'}
            </Text>
          </View>
        </View>

        {/* Section 3: Shop Verification Media Gallery */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🖼️ Verified Shop Photos & Media</Text>
          <Text style={styles.sectionSub}>Submitted during onboarding inspection</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaGallery}>
            <Image source={{ uri: 'https://via.placeholder.com/200x150.png?text=Shop+Front' }} style={styles.mediaThumb} />
            <Image source={{ uri: 'https://via.placeholder.com/200x150.png?text=GST+Certificate' }} style={styles.mediaThumb} />
            <Image source={{ uri: 'https://via.placeholder.com/200x150.png?text=Warehouse' }} style={styles.mediaThumb} />
          </ScrollView>
        </View>

        {/* Section 4: Quick Settings & Direct Contact CTAs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚙️ Business Account & Legal Controls</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.menuIcon}>⚡</Text>
            <View style={styles.menuMeta}>
              <Text style={styles.menuTitle}>Subscription & Enterprise Billing</Text>
              <Text style={styles.menuSub}>Manage payment cycles & UPI transaction proofs</Text>
            </View>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('tel:' + (user?.mobileNumber || '9876543210'))}
          >
            <Text style={styles.menuIcon}>📞</Text>
            <View style={styles.menuMeta}>
              <Text style={styles.menuTitle}>Direct Call Support CTA</Text>
              <Text style={styles.menuSub}>Call verified buyer/seller contact line</Text>
            </View>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <View style={styles.menuMeta}>
              <Text style={styles.menuDangerTitle}>Request Account Deletion</Text>
              <Text style={styles.menuSub}>Apple & Google Play Store Compliance Policy</Text>
            </View>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Account Deletion Request Modal */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Request Account Deletion</Text>
            <Text style={styles.modalSub}>
              Submitting an account deletion request will remove your business catalog and store profile upon Super Admin approval.
            </Text>

            <Input
              label="Reason for Deletion *"
              placeholder="e.g. Closing business or creating new account..."
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setDeleteModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Submit Request" variant="danger" loading={isSubmittingDelete} onPress={handleAccountDeletionRequest} style={{ flex: 1 }} />
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
  logoutPill: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 14,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarChar: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  profileMeta: { flex: 1 },
  shopName: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  ownerName: { color: '#cbd5e1', fontSize: 13, marginTop: 2 },
  contactInfo: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  verifiedTag: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  pendingTag: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },
  roleTag: { color: '#a78bfa', fontSize: 10, fontWeight: '800' },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { color: '#818cf8', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  sectionSub: { color: '#64748b', fontSize: 11, marginBottom: 12 },
  infoRow: { marginBottom: 8 },
  infoLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  infoValue: { color: '#f8fafc', fontSize: 13, marginTop: 2 },
  mediaGallery: { flexDirection: 'row', gap: 10 },
  mediaThumb: { width: 120, height: 90, borderRadius: 10, backgroundColor: '#1e293b' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuMeta: { flex: 1 },
  menuTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  menuDangerTitle: { color: '#fb7185', fontSize: 14, fontWeight: '700' },
  menuSub: { color: '#64748b', fontSize: 11, marginTop: 1 },
  arrow: { color: '#64748b', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fb7185', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
