import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const isSuperAdmin = user?.email === 'dnpatel2002@gmail.com' || user?.business?.assignedRole === 'SUPER_ADMIN';

  const handleSignOut = () => {
    authService.logoutUser(dispatch);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>👤 Business Profile & Account</Text>

      <Card>
        <Text style={styles.name}>{user?.fullName || 'Vendor Name'}</Text>
        <Text style={styles.email}>{user?.email || 'owner@example.com'}</Text>
        <Text style={styles.phone}>📞 {user?.mobileNumber || '9876543210'}</Text>

        {isSuperAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>🛡️ SUPER ADMIN PRIVILEGES</Text>
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>🏢 Shop Profile</Text>
        <Text style={styles.shopName}>{user?.business?.shopName || 'N/A'}</Text>
        <Text style={styles.info}>GST: {user?.business?.gstNumber || 'No GST Provided'}</Text>
        <Text style={styles.info}>
          Location: {user?.business ? `${user.business.streetAddress}, ${user.business.city}, ${user.business.state} - ${user.business.pincode}` : 'N/A'}
        </Text>
      </Card>

      <Button title="Sign Out ➔" variant="secondary" onPress={handleSignOut} style={styles.logoutBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  email: { color: '#818cf8', fontSize: 12, marginTop: 2 },
  phone: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  adminBadge: { backgroundColor: 'rgba(225, 29, 72, 0.15)', borderWidth: 1, borderColor: '#f43f5e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 12 },
  adminBadgeText: { color: '#fb7185', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  sectionTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  shopName: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  info: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  logoutBtn: { marginTop: 12, marginBottom: 32 },
});
