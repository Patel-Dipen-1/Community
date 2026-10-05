import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useCreateStatusMutation } from '../store/api/statusApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateStatus'>;

export const CreateStatusScreen: React.FC<Props> = ({ navigation }) => {
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [targetCategory, setTargetCategory] = useState('clothing');
  const [createStatus, { isLoading }] = useCreateStatusMutation();

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handlePostStatus = async () => {
    if (!caption.trim() && !mediaUri) {
      Alert.alert('Content Required', 'Please enter a caption or pick an image update.');
      return;
    }

    try {
      await createStatus({
        caption: caption.trim() || undefined,
        mediaUrl: mediaUri || undefined,
        mediaType: mediaUri ? 'IMAGE' : 'TEXT',
        categories: [targetCategory],
      }).unwrap();

      Alert.alert('Status Posted', 'Your 24-hour status update is now live for buyers!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Posting Error', err?.data?.error || 'Failed to post status.');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Post 24h Supplier Update" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Media Preview / Picker */}
        <TouchableOpacity style={styles.mediaPicker} onPress={handlePickMedia}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
          ) : (
            <View style={styles.pickerPlaceholder}>
              <Text style={styles.pickerIcon}>📷</Text>
              <Text style={styles.pickerText}>Tap to pick photo or video update</Text>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Caption / Business Message"
          placeholder="e.g. Fresh summer silk saree inventory arrived in Surat warehouse..."
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Target Community Category:</Text>
        <View style={styles.catRow}>
          {['clothing', 'jewellery', 'electronics', 'hardware'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, targetCategory === cat && styles.catPillActive]}
              onPress={() => setTargetCategory(cat)}
            >
              <Text style={[styles.catText, targetCategory === cat && styles.catTextActive]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Publish 24h Status Update"
          loading={isLoading}
          onPress={handlePostStatus}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 16 },
  mediaPicker: {
    height: 200,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mediaPreview: { width: '100%', height: '100%' },
  pickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerIcon: { fontSize: 32, marginBottom: 8 },
  pickerText: { color: '#94a3b8', fontSize: 13 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  catRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catPill: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b' },
  catPillActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  catText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  catTextActive: { color: '#ffffff' },
});
