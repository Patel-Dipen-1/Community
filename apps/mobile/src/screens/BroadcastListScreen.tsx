import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { CreateBroadcastModal } from '../components/CreateBroadcastModal';
import {
  useGetBroadcastListsQuery,
  useSendBroadcastMessageMutation,
  useDeleteBroadcastListMutation,
} from '../store/api/broadcastApi';

type Props = NativeStackScreenProps<RootStackParamList, 'BroadcastList'>;

export const BroadcastListScreen: React.FC<Props> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { data, isLoading, refetch } = useGetBroadcastListsQuery();
  const [sendBroadcast] = useSendBroadcastMessageMutation();
  const [deleteBroadcast] = useDeleteBroadcastListMutation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDispatchPrompt = (item: any) => {
    Alert.prompt(
      `📢 Dispatch to ${item.title}`,
      `Type your broadcast announcement to send 1-to-1 to all ${item.recipientsCount || item.recipients?.length || 0} contact(s):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch 🚀',
          onPress: async (msgText?: string) => {
            if (!msgText || !msgText.trim()) return;
            try {
              const res = await sendBroadcast({
                id: item.id,
                text: msgText.trim(),
              }).unwrap();

              Alert.alert('Broadcast Sent! 🎉', res.message || `Dispatched to ${res.dispatchedCount} recipient(s).`);
            } catch (err: any) {
              Alert.alert('Dispatch Error', err?.data?.error || err?.message || 'Failed to dispatch broadcast message.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Broadcast List', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBroadcast(id).unwrap();
            Alert.alert('Deleted', 'Broadcast list deleted.');
          } catch (err: any) {
            Alert.alert('Error', err?.data?.error || 'Failed to delete list.');
          }
        },
      },
    ]);
  };

  const broadcastLists = data?.broadcastLists || [];

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />}
      >
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>📢</Text>
          <View style={styles.infoMeta}>
            <Text style={styles.infoTitle}>Recipient Privacy Protected</Text>
            <Text style={styles.infoSub}>
              Recipients receive individual 1-to-1 direct message cards without visibility into other contacts on your list.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 40 }} />
        ) : broadcastLists.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No Broadcast Lists</Text>
            <Text style={styles.emptySub}>
              Create broadcast lists to dispatch SKU updates and catalog offers to multiple buyers at once.
            </Text>
            <TouchableOpacity style={styles.createEmptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.createEmptyBtnText}>+ Create First List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          broadcastLists.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleDispatchPrompt(b)}
            >
              <View style={styles.cardIconBox}>
                <Text style={styles.cardIcon}>📢</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardTitle}>{b.title}</Text>
                <Text style={styles.cardRecipients}>
                  {b.recipientsCount ?? b.recipients?.length ?? 0} Verified Contacts
                </Text>
                {b.description ? <Text style={styles.cardDesc} numberOfLines={1}>{b.description}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.dispatchBtn} onPress={() => handleDispatchPrompt(b)}>
                  <Text style={styles.dispatchText}>Dispatch ➔</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(b.id, b.title)}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Broadcast List Modal */}
      <CreateBroadcastModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onListCreated={() => refetch()}
      />
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
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 18 },
  createEmptyBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  createEmptyBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', padding: 14, marginBottom: 12 },
  cardIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardIcon: { fontSize: 20 },
  cardMeta: { flex: 1 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  cardRecipients: { color: '#38bdf8', fontSize: 11, marginTop: 2 },
  cardDesc: { color: '#64748b', fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dispatchBtn: { backgroundColor: '#1e1b4b', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#4338ca' },
  dispatchText: { color: '#818cf8', fontSize: 11, fontWeight: '800' },
  deleteBtn: { padding: 6 },
  deleteText: { fontSize: 14 },
});
