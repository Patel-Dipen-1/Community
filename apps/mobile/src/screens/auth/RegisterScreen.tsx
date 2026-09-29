import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { AuthStackParamList } from '../../types/navigation.types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useRegisterMutation } from '../../services/api/authApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Mandatory Media Verification Uploads State
  const [visitingCardUri, setVisitingCardUri] = useState<string | null>(null);
  const [shopPhotoUri, setShopPhotoUri] = useState<string | null>(null);
  const [shopVideoUri, setShopVideoUri] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();

  // Helper to pick Photo from Gallery or Camera
  const pickPhoto = async (type: 'VISITING_CARD' | 'SHOP_PHOTO') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to upload shop photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (type === 'VISITING_CARD') {
          setVisitingCardUri(uri);
        } else {
          setShopPhotoUri(uri);
        }
      }
    } catch (err) {
      // Demo fallback if emulator/simulator gallery fails
      const demoPhoto = type === 'VISITING_CARD'
        ? 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800'
        : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
      if (type === 'VISITING_CARD') setVisitingCardUri(demoPhoto);
      else setShopPhotoUri(demoPhoto);
      Alert.alert('Demo Photo Selected', `Attached sample ${type === 'VISITING_CARD' ? 'Visiting Card' : 'Shop Photo'}.`);
    }
  };

  // Helper to pick Video Reel from Gallery
  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to upload shop video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShopVideoUri(result.assets[0].uri);
      }
    } catch (err) {
      // Demo fallback video reel link
      const demoVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      setShopVideoUri(demoVideo);
      Alert.alert('Demo Video Selected', 'Attached sample Shop Inspection Video Reel.');
    }
  };

  const handleRegister = async () => {
    if (!fullName || !shopName || !mobileNumber || !email || !password) {
      Alert.alert('Missing Info', 'Please fill in all required business profile details.');
      return;
    }

    // MANDATORY MEDIA VALIDATION CHECK: Requires 2 Images (Visiting Card + Shop Photo) AND 1 Video
    if (!visitingCardUri || !shopPhotoUri || !shopVideoUri) {
      Alert.alert(
        '⚠️ Mandatory Verification Media Missing!',
        'Super Admin verification requires mandatory uploads:\n\n1. Visiting Card Photo (Mandatory)\n2. Shop Front Photo (Mandatory)\n3. Shop Inspection Video Reel (Mandatory)\n\nPlease attach all 3 media files to proceed.',
        [
          {
            text: 'Attach Sample Preset Media',
            onPress: () => {
              setVisitingCardUri('https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800');
              setShopPhotoUri('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800');
              setShopVideoUri('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
            },
          },
          { text: 'OK' },
        ]
      );
      return;
    }

    try {
      const shopMediaUrls = [visitingCardUri, shopPhotoUri, shopVideoUri];

      const response = await register({
        fullName: fullName.trim(),
        shopName: shopName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password,
        streetAddress: streetAddress.trim() || 'Main Market Road',
        city: city.trim() || 'Surat',
        state: state.trim() || 'Gujarat',
        pincode: pincode.trim() || '395002',
        gstNumber: gstNumber.trim() || undefined,
        shopMediaUrls,
      }).unwrap();

      Alert.alert(
        'Registration Submitted! 🎉',
        response.message || 'Your business profile with 2 photos & inspection video has been submitted for Super Admin review.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      const errorMsg = err?.data?.error || err?.message || 'Registration failed.';
      Alert.alert('Error', errorMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Register B2B Account 🏢</Text>
        <Text style={styles.subtitle}>Join verified Manufacturers, Wholesalers & Retailers</Text>
      </View>

      <View style={styles.form}>
        <Input label="Owner Full Name *" placeholder="e.g. Dipen Patel" value={fullName} onChangeText={setFullName} />
        <Input label="Shop / Business Name *" placeholder="e.g. Royal Textiles" value={shopName} onChangeText={setShopName} />
        <Input label="Mobile Number *" placeholder="e.g. 9876543210" keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} />
        <Input label="Email Address *" placeholder="e.g. owner@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Input label="Password *" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="City *" placeholder="e.g. Surat" value={city} onChangeText={setCity} />
        <Input label="GST Number (Optional)" placeholder="e.g. 24AAAAA0000A1Z5" value={gstNumber} onChangeText={setGstNumber} />

        {/* 📸 MANDATORY MEDIA UPLOADS NOTICE & CONTROLS */}
        <Card style={styles.mediaCard}>
          <Text style={styles.mediaTitle}>⚠️ MANDATORY VERIFICATION MEDIA</Text>
          <Text style={styles.mediaNotice}>
            Super Admin verification approval requires mandatory upload of <Text style={styles.boldText}>2 Photos</Text> (Visiting Card & Shop Front) and <Text style={styles.boldText}>1 Video Reel</Text> (Shop Walkthrough).
          </Text>

          {/* 1. Visiting Card Photo Upload */}
          <View style={styles.uploadItem}>
            <Text style={styles.uploadLabel}>1. Business Visiting Card (Photo *)</Text>
            {visitingCardUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: visitingCardUri }} style={styles.previewImage} />
                <TouchableOpacity onPress={() => setVisitingCardUri(null)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button title="📷 Upload Visiting Card Photo *" variant="secondary" onPress={() => pickPhoto('VISITING_CARD')} />
            )}
          </View>

          {/* 2. Main Shop Front Photo Upload */}
          <View style={styles.uploadItem}>
            <Text style={styles.uploadLabel}>2. Main Shop / Premises (Photo *)</Text>
            {shopPhotoUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: shopPhotoUri }} style={styles.previewImage} />
                <TouchableOpacity onPress={() => setShopPhotoUri(null)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button title="📷 Upload Main Shop Photo *" variant="secondary" onPress={() => pickPhoto('SHOP_PHOTO')} />
            )}
          </View>

          {/* 3. Shop Inspection Video Reel Upload */}
          <View style={styles.uploadItem}>
            <Text style={styles.uploadLabel}>3. Shop Inspection Video Reel (Video *)</Text>
            {shopVideoUri ? (
              <View style={styles.previewBox}>
                <Text style={styles.videoAttachedText}>🎥 Shop Video Reel Attached</Text>
                <TouchableOpacity onPress={() => setShopVideoUri(null)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button title="🎥 Upload Shop Inspection Video *" variant="secondary" onPress={pickVideo} />
            )}
          </View>
        </Card>

        <Button title="Submit Registration ➔" onPress={handleRegister} loading={isLoading} style={styles.submitBtn} />
        <Button title="Already have an account? Sign In" variant="outline" onPress={() => navigation.navigate('Login')} style={styles.backBtn} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#020617',
    padding: 24,
  },
  header: {
    marginTop: 24,
    marginBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  form: {
    width: '100%',
  },
  mediaCard: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    marginVertical: 12,
  },
  mediaTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  mediaNotice: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 14,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  uploadItem: {
    marginBottom: 14,
  },
  uploadLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: 60,
    height: 44,
    borderRadius: 6,
  },
  videoAttachedText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e11d48',
    borderRadius: 8,
  },
  removeBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 8,
  },
  backBtn: {
    marginTop: 12,
    marginBottom: 32,
  },
});
