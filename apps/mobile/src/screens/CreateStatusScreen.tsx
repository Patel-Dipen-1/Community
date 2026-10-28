import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation.types';
import { Header, Input, Button, BodyText, MutedText } from '../components/common';
import { colors, spacing, borderRadius } from '../theme/theme';
import { useCreateStatusMutation, useGetPosterConfigQuery } from '../store/api/statusApi';
import { useGetMyStoreQuery } from '../store/api/storeApi';
import { useAppSelector } from '../hooks/useRedux';
import { uploadMediaFile } from '../services/api/uploadService';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateStatus'>;

const TEXT_STATUS_BG_COLORS = [
  '#0f172a', // Deep Slate
  '#1e3a8a', // Deep Navy Blue
  '#14532d', // Forest Emerald
  '#701a75', // Royal Purple
  '#7c2d12', // Warm Amber/Rust
  '#831843', // Rose Red
];

export const CreateStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { data: storeData } = useGetMyStoreQuery();
  const { data: posterConfig } = useGetPosterConfigQuery();

  const isSuperAdmin = Boolean(
    (user as any)?.role === 'SUPER_ADMIN' ||
    user?.email === 'dnpatel2002@gmail.com' ||
    (user as any)?.assignedRole === 'SUPER_ADMIN' ||
    user?.business?.assignedRole === 'SUPER_ADMIN'
  );

  // Extract allowed communities from backend config, user business profile, or store profile
  const userCommunities = user?.business?.allowedCommunities || [];
  const storeCommunities = (storeData as any)?.business?.allowedCommunities || (storeData as any)?.store?.business?.allowedCommunities || [];
  const configCommunities = posterConfig?.allowedCommunities || [];

  const allSystemCommunities = ['clothing', 'hardware', 'electronics', 'grocery'];

  const allowedCommunities: string[] = isSuperAdmin
    ? allSystemCommunities
    : Array.from(
        new Set([...configCommunities, ...userCommunities, ...storeCommunities].filter(Boolean))
      );

  const finalCommunities = allowedCommunities.length > 0 ? allowedCommunities : ['clothing'];

  const isApproved = Boolean(
    isSuperAdmin ||
    posterConfig?.isApproved ||
    user?.isVerified ||
    user?.status === 'APPROVED' ||
    user?.business?.verificationTag
  );

  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [targetCategory, setTargetCategory] = useState<string>(finalCommunities[0]);
  const [selectedBgColor, setSelectedBgColor] = useState<string>(TEXT_STATUS_BG_COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createStatus, { isLoading }] = useCreateStatusMutation();

  useEffect(() => {
    if (finalCommunities.length > 0 && !finalCommunities.includes(targetCategory)) {
      setTargetCategory(finalCommunities[0]);
    }
  }, [finalCommunities.join(',')]);

  const handlePickMedia = async () => {
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permissions are needed to select photos or videos for status updates.'
        );
        return;
      }

      // Modern Expo SDK 52+ array of media types (eliminates MediaTypeOptions deprecation warning)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('Error launching media library:', err);
      Alert.alert('Media Error', 'Failed to pick media from gallery: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePostStatus = async (keepPosting = false) => {
    setErrorMessage(null);

    if (!isApproved) {
      const msg = 'UNAPPROVED_ACCOUNT: Only Super Admin approved vendor accounts can post 24h WhatsApp trade statuses.';
      setErrorMessage(msg);
      Alert.alert('Approval Required', 'Only Super Admin approved vendor accounts can post WhatsApp statuses.');
      return;
    }

    if (!caption.trim() && !mediaUri) {
      const msg = 'CONTENT_REQUIRED: Please enter a text message or pick an image update.';
      setErrorMessage(msg);
      Alert.alert('Content Required', 'Please enter a caption or pick an image/video update.');
      return;
    }

    try {
      setUploading(true);
      let uploadedMediaUrl: string | undefined = undefined;

      if (mediaUri) {
        // Upload via universal uploadService which uses Native XHR / Blob (fixes Unsupported FormDataPart error)
        uploadedMediaUrl = await uploadMediaFile(mediaUri);
      }

      const mediaType = uploadedMediaUrl
        ? uploadedMediaUrl.match(/\.(mp4|webm|mov)$/i)
          ? 'VIDEO'
          : 'IMAGE'
        : 'TEXT';

      await createStatus({
        caption: caption.trim() || undefined,
        mediaUrl: uploadedMediaUrl,
        mediaType,
        bgColor: mediaType === 'TEXT' ? selectedBgColor : undefined,
        categories: [targetCategory],
      }).unwrap();

      setUploading(false);

      if (keepPosting) {
        Alert.alert(
          'Frame Live! 🟢',
          `Status frame posted to [${targetCategory.toUpperCase()}]! Ready for your next status frame.`
        );
        setCaption('');
        setMediaUri(null);
      } else {
        Alert.alert(
          'Status Live! 🟢',
          `Your 24-hour status update is live in [${targetCategory.toUpperCase()}]!`,
          [
            {
              text: 'View Stories',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      setUploading(false);
      console.warn('Status posting error:', err);
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

  const showCategoryPicker = finalCommunities.length > 1;

  return (
    <View style={styles.container}>
      <Header title="Post 24h Supplier Status" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.ruleBullet}>
            • <Text style={styles.boldText}>Targeted Visibility:</Text> Statuses posted in{' '}
            <Text style={styles.highlightText}>[{targetCategory.toUpperCase()}]</Text> can only be watched by verified buyers in that trade category.
          </Text>
          <Text style={styles.ruleBullet}>
            • <Text style={styles.boldText}>24-Hour Expiration:</Text> Statuses expire automatically after 24 hours.
          </Text>
          <Text style={styles.ruleBullet}>
            • <Text style={styles.boldText}>Permitted Category Rule:</Text> You can only post to community categories assigned to your business account.
          </Text>
        </View>

        {/* Media Preview / Picker */}
        <TouchableOpacity style={styles.mediaPicker} onPress={handlePickMedia} activeOpacity={0.8}>
          {mediaUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeMediaBtn}
                onPress={() => setMediaUri(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeMediaText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerPlaceholder}>
              <Text style={styles.pickerIcon}>📷</Text>
              <Text style={styles.pickerText}>Tap to pick photo or video update</Text>
              <MutedText style={styles.pickerSubText}>Or leave empty to post a styled text story</MutedText>
            </View>
          )}
        </TouchableOpacity>

        {/* Background Color Picker for Pure Text Stories */}
        {!mediaUri && (
          <View style={styles.bgSection}>
            <Text style={styles.bgLabel}>Text Story Background Color:</Text>
            <View style={styles.bgRow}>
              {TEXT_STATUS_BG_COLORS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bgCircle,
                    { backgroundColor: bg },
                    selectedBgColor === bg && styles.bgCircleActive,
                  ]}
                  onPress={() => setSelectedBgColor(bg)}
                >
                  {selectedBgColor === bg && <Text style={styles.bgCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Caption / Business Message Input */}
        <Input
          label="Caption / Business Message"
          placeholder="e.g. Fresh festive wholesale arrival in Surat warehouse..."
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
              {finalCommunities.map((cat) => (
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
              Posting to assigned community:{' '}
              <Text style={styles.singleCatValue}>[{targetCategory.toUpperCase()}]</Text>
            </Text>
          </View>
        )}

        {/* Action Buttons: Single Post vs Post & Add Next Frame */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity
            style={styles.addNextBtn}
            disabled={isLoading || uploading}
            onPress={() => handlePostStatus(true)}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color="#10b981" size="small" />
            ) : (
              <Text style={styles.addNextBtnText}>+ Post & Add Next Frame</Text>
            )}
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
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  unapprovedCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: spacing.md,
  },
  unapprovedTitle: { color: '#f87171', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  unapprovedBody: { color: '#cbd5e1', fontSize: 11, lineHeight: 16 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorIcon: { fontSize: 16 },
  errorText: { color: '#fca5a5', fontSize: 12, fontWeight: '700', flex: 1 },

  rulesCard: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: spacing.md,
  },
  rulesHeader: { color: '#818cf8', fontSize: 13, fontWeight: '800', marginBottom: spacing.xs },
  ruleBullet: { color: '#94a3b8', fontSize: 11, lineHeight: 16, marginBottom: 4 },
  boldText: { color: '#ffffff', fontWeight: '800' },
  highlightText: { color: '#38bdf8', fontWeight: '800' },

  mediaPicker: {
    height: 200,
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  previewContainer: { width: '100%', height: '100%', position: 'relative' },
  mediaPreview: { width: '100%', height: '100%' },
  removeMediaBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  removeMediaText: { color: '#fca5a5', fontSize: 11, fontWeight: '800' },
  pickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  pickerIcon: { fontSize: 36, marginBottom: spacing.xs },
  pickerText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  pickerSubText: { fontSize: 11, marginTop: 4, textAlign: 'center' },

  bgSection: { marginBottom: spacing.md },
  bgLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  bgRow: { flexDirection: 'row', gap: 10 },
  bgCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircleActive: { borderColor: '#ffffff', transform: [{ scale: 1.1 }] },
  bgCheck: { color: '#ffffff', fontSize: 14, fontWeight: '900' },

  catSection: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  catPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPillActive: { backgroundColor: '#4f46e5', borderColor: '#818cf8' },
  catText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  catTextActive: { color: '#ffffff' },

  singleCategoryNotice: {
    backgroundColor: '#0f172a',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  singleCatLabel: { color: '#94a3b8', fontSize: 12 },
  singleCatValue: { color: '#38bdf8', fontWeight: '900' },

  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  addNextBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  addNextBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '900',
  },
});
