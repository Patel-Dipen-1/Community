import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';
import { useAppSelector } from '../../hooks/useRedux';

export const HomeScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.fullName || 'Vendor'} 👋</Text>
        <Text style={styles.shopName}>{user?.business?.shopName || 'B2B Business'}</Text>
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🛡️ Verified Business Status</Text>
          <Text style={styles.badge}>
            {user?.isVerified ? '✓ Approved' : 'Pending'}
          </Text>
        </View>
        <Text style={styles.cardText}>
          Assigned Role: <Text style={styles.highlight}>{user?.business?.assignedRole || 'WHOLESALER'}</Text>
        </Text>
        <Text style={styles.cardText}>
          Allowed Communities: <Text style={styles.highlight}>{user?.business?.allowedCommunities?.join(', ') || 'clothing'}</Text>
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>⚡ Quick Platform Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>1,240+</Text>
            <Text style={styles.statLabel}>Verified Vendors</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>9</Text>
            <Text style={styles.statLabel}>Trade Communities</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  header: { marginBottom: 20 },
  greeting: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  shopName: { color: '#818cf8', fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  badge: { color: '#34d399', fontSize: 12, fontWeight: '800', backgroundColor: 'rgba(52, 211, 153, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cardText: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  highlight: { color: '#818cf8', fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  statBox: { alignItems: 'center' },
  statNumber: { color: '#38bdf8', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
});
