import React, { useState, useEffect } from 'react';
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
import { Header, Input, Button, BodyText, MutedText, SectionTitle } from '../components/common';
import { colors, spacing, borderRadius } from '../theme/theme';
import { useCreateStatusMutation } from '../store/api/statusApi';
import { useGetMyStoreQuery } from '../store/api/storeApi';
import { useAppSelector } from '../hooks/useRedux';
import { ENV_CONFIG } from '../constants/config';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateStatus'>;

export const CreateStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: storeData } = useGetMyStoreQuery();
  const allowedCommunities: string[] = storeData?.store?.business?.allowedCommunities || ['clothing'];

  const isApproved = Boolean(user?.isVerified || user?.status === 'APPROVED');

  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [targetCategory, setTargetCategory] = useState<string>(allowedCommunities[0] || 'clothing');
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createStatus, { isLoading }] = useCreateStatusMutation();

  useEffect(() => {
    if (allowedCommunities.length > 0) {
      setTargetCategory(allowedCommunities[0]);
    }
  }, [allowedCommunities.length]);

  const handlePickMedia = async () => {
    setErrorMessage(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handlePostStatus = async (keepPosting = false) => {
    setErrorMessage(null);

    if (!isApproved) {
      setErrorMessage('UNAPPROVED_ACCOUNT: Only Super Admin approved vendor accounts can post 24h WhatsApp trade statuses.');
      Alert.alert('Approval Required', 'Only Super Admin approved vendor accounts can post WhatsApp statuses.');
      return;
    }

    if (!caption.trim() && !mediaUri) {
      setErrorMessage('CONTENT_REQUIRED: Please enter a text message or pick an image update.');
      Alert.alert('Content Required', 'Please enter a caption or pick an image update.');
      return;
    }

    try {
      setUploading(true);
      let uploadedMediaUrl: string | undefined = undefined;

      if (mediaUri) {
        if (mediaUri.startsWith('http://') || mediaUri.startsWith('https://')) {
          uploadedMediaUrl = mediaUri;
        } else {
          // Upload local media file
          const formData = new FormData();
          formData.append('file', {
            uri: mediaUri,
            name: `status_${Date.now()}.jpg`,
            type: 'image/jpeg',
          } as any);

          const uploadRes = await fetch(`${ENV_CONFIG.API_BASE_URL}/upload/single`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const rawText = await uploadRes.text();
          let uploadData: any = {};
          try {
            uploadData = JSON.parse(rawText);
          } catch (e) {
            console.warn('Upload response non-JSON text:', rawText);
          }
          uploadedMediaUrl = uploadData.url || uploadData.file?.url || mediaUri;
        }
      }

      await createStatus({
        caption: caption.trim() || undefined,
        mediaUrl: uploadedMediaUrl,
        mediaType: uploadedMediaUrl ? (uploadedMediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'VIDEO' : 'IMAGE') : 'TEXT',
        categories: [targetCategory],
      }).unwrap();

      setUploading(false);

      if (keepPosting) {
        Alert.alert('Frame Live! 🟢', `Status frame posted to [${targetCategory.toUpperCase()}]! Ready for next status frame.`);
        setCaption('');
        setMediaUri(null);
      } else {
        Alert.alert('Status Posted', `Your 24-hour status update is live in [${targetCategory.toUpperCase()}]!`);
        navigation.goBack();
      }
    } catch (err: any) {
      setUploading(false);
      const errorMsg =
        err?.data?.error ||
        err?.data?.message ||
        (typeof err?.error === 'string' ? err.error : null) ||
        err?.message ||
        'Failed to post status update.';
      setErrorMessage(errorMsg);
      Alert.alert('Posting Error', errorMsg);
    }
  };

  const showCategoryPicker = allowedCommunities.length > 1;

  return (
    <View style={styles.container}>
      <Header title="Post 24h Supplier Status" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Unapproved Warning Card */}
        {!isApproved && (
          <View style={styles.unapprovedCard}>
            <Text style={styles.unapprovedTitle}>🔒 Super Admin Approval Required</Text>
            <Text style={styles.unapprovedBody}>
              Your account status is currently UNAPPROVED. Only verified vendor accounts approved by Super Admin can publish 24-hour WhatsApp statuses to buyers.
            </Text>
          </View>
        )}

        {/* Dynamic Error Message Box */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* WhatsApp Status Rules Banner */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesHeader}>📋 WhatsApp Status Rules & Isolation</Text>
          <Text style={styles.ruleBullet}>• <Text style={styles.boldText}>Targeted Visibility:</Text> Statuses posted in <Text style={styles.highlightText}>[{targetCategory.toUpperCase()}]</Text> can only be watched by members of that category community.</Text>
          <Text style={styles.ruleBullet}>• <Text style={styles.boldText}>24-Hour Expiration:</Text> Statuses expire automatically after 24 hours.</Text>
          <Text style={styles.ruleBullet}>• <Text style={styles.boldText}>Permitted Category Rule:</Text> You can only post to community categories assigned to your business.</Text>
        </View>

        {/* Media Preview / Picker */}
        <TouchableOpacity style={styles.mediaPicker} onPress={handlePickMedia}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
          ) : (
            <View style={styles.pickerPlaceholder}>
              <Text style={styles.pickerIcon}>📷</Text>
              <MutedText style={styles.pickerText}>Tap to pick photo or video update</MutedText>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Caption / Business Message"
          placeholder="e.g. Fresh summer wholesale arrival in Surat warehouse..."
          value={caption}
          onChangeText={(txt) => {
            setCaption(txt);
            if (errorMessage) setErrorMessage(null);
          }}
          multiline
          numberOfLines={3}
        />

        {/* Category Selection Logic */}
        {showCategoryPicker ? (
          <View style={styles.catSection}>
            <BodyText style={styles.label}>Select Target Community Category:</BodyText>
            <View style={styles.catRow}>
              {allowedCommunities.map((cat) => (
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
          </View>
        ) : (
          <View style={styles.singleCategoryNotice}>
            <Text style={styles.singleCatLabel}>
              Posting to assigned community: <Text style={styles.singleCatValue}>[{targetCategory.toUpperCase()}]</Text>
            </Text>
          </View>
        )}

        {/* Action Buttons: Single Post vs Post & Add Next Frame */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity
            style={styles.addNextBtn}
            disabled={isLoading || uploading}
            onPress={() => handlePostStatus(true)}
          >
            <Text style={styles.addNextBtnText}>+ Post & Add Next Frame</Text>
          </TouchableOpacity>

          <Button
            title={uploading ? 'Uploading Media...' : 'Publish Status ➔'}
            loading={isLoading || uploading}
            onPress={() => handlePostStatus(false)}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },

  unapprovedCard: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  unapprovedTitle: { color: colors.errorLight, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  unapprovedBody: { color: colors.textLight, fontSize: 11, lineHeight: 16 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorIcon: { fontSize: 16 },
  errorText: { color: colors.errorLight, fontSize: 12, fontWeight: '700', flex: 1 },

  rulesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  rulesHeader: { color: colors.primaryLight, fontSize: 13, fontWeight: '800', marginBottom: spacing.xs },
  ruleBullet: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  boldText: { color: colors.textMain, fontWeight: '800' },
  highlightText: { color: colors.accentLight, fontWeight: '800' },

  mediaPicker: {
    height: 200,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  mediaPreview: { width: '100%', height: '100%' },
  pickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerIcon: { fontSize: 32, marginBottom: spacing.xs },
  pickerText: { fontSize: 13 },

  catSection: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  catPill: { backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primaryLight },
  catText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  catTextActive: { color: colors.textMain },

  singleCategoryNotice: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  singleCatLabel: { color: colors.textMuted, fontSize: 12 },
  singleCatValue: { color: colors.accentLight, fontWeight: '900' },

  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  addNextBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNextBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '900',
  },
});
