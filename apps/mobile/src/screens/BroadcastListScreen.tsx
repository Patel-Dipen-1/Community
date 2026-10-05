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
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'BroadcastList'>;

export const BroadcastListScreen: React.FC<Props> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [broadcasts, setBroadcasts] = useState([
    {
      id: 'b-1',
      title: 'Surat Garment Retailers List',
      recipientsCount: 45,
      lastSent: '2 hours ago',
      status: 'COMPLETED',
    },
    {
      id: 'b-2',
      title: 'Jewellery Wholesale Buyers',
      recipientsCount: 28,
      lastSent: 'Yesterday',
      status: 'COMPLETED',
    },
  ]);

  const handleCreateList = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a name for your broadcast list.');
      return;
    }

    setBroadcasts([
      ...broadcasts,
      {
        id: `b-${Date.now()}`,
        title: title.trim(),
        recipientsCount: 12,
        lastSent: 'Just now',
        status: 'READY',
      },
    ]);

    setModalVisible(false);
    setTitle('');
    setDescription('');
    Alert.alert('Broadcast List Created', 'You can now select recipients and dispatch catalog updates.');
  };

  return (
    <View style={styles.container}>
      <Header
        title="WhatsApp Broadcast Lists"
        subtitle="Multi-Recipient 1-to-1 Dispatch"
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.createBtnText}>+ New List</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>📢</Text>
          <View style={styles.infoMeta}>
            <Text style={styles.infoTitle}>Recipient Privacy Protected</Text>
            <Text style={styles.infoSub}>
              Recipients receive individual 1-to-1 direct message cards without visibility into other contacts on your list.
            </Text>
          </View>
        </View>

        {broadcasts.map((b) => (
          <TouchableOpacity key={b.id} style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIcon}>📢</Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardTitle}>{b.title}</Text>
              <Text style={styles.cardRecipients}>{b.recipientsCount} Verified Contacts</Text>
              <Text style={styles.cardTime}>Last sent: {b.lastSent}</Text>
            </View>
            <TouchableOpacity
              style={styles.dispatchBtn}
              onPress={() => Alert.alert('Dispatch Broadcast', `Dispatch product message to ${b.recipientsCount} recipients in ${b.title}?`)}
            >
              <Text style={styles.dispatchText}>Dispatch ➔</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create Broadcast List Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📢 Create Broadcast List</Text>
            <Text style={styles.modalSub}>Group contacts for rapid SKU broadcast announcements.</Text>

            <Input label="List Title *" placeholder="e.g. Surat Cotton Buyers" value={title} onChangeText={setTitle} />
            <Input label="Description" placeholder="Optional notes for list management..." value={description} onChangeText={setDescription} />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Create List" onPress={handleCreateList} style={{ flex: 1 }} />
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
  createBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  createBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1b4b', borderRadius: 14, borderWidth: 1, borderColor: '#4338ca', padding: 14, marginBottom: 16 },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoMeta: { flex: 1 },
  infoTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  infoSub: { color: '#cbd5e1', fontSize: 11, marginTop: 2, lineHeight: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', padding: 14, marginBottom: 12 },
  cardIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardIcon: { fontSize: 20 },
  cardMeta: { flex: 1 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  cardRecipients: { color: '#38bdf8', fontSize: 11, marginTop: 2 },
  cardTime: { color: '#64748b', fontSize: 10, marginTop: 2 },
  dispatchBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  dispatchText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
