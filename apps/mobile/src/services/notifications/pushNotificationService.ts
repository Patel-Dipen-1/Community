import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../storage/authStorage';
import Constants from 'expo-constants';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[PushNotificationService] Failed to set notification handler:', e);
}

export class PushNotificationService {
  /**
   * Register device push notification token with backend API
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // In Expo Go on Android (SDK 53+), remote push notifications were removed by Expo.
      // Remote notifications work in development builds (npx expo run:android) or standalone APK builds.
      if (isRunningInExpoGo() && Platform.OS === 'android') {
        
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'Default Business Notifications',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#818cf8',
            });
          } catch {}
        }
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied by user.');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants.manifest as any)?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
      if (!tokenData) return null;
      const token = tokenData.data;

      // Send token to backend API
      const authToken = await authStorage.getToken();
      if (authToken && token) {
        await fetch(`${ENV_CONFIG.API_BASE_URL}/user/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token,
            platform: Platform.OS.toUpperCase(),
          }),
        }).catch(() => {});
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Business Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#818cf8',
        }).catch(() => {});
      }

      return token;
    } catch (error) {
      console.warn('Error registering push notifications:', error);
      return null;
    }
  }

  /**
   * Add listener for notification tap / deep link
   */
  static addNotificationTapListener(onTap: (notification: Notifications.NotificationResponse) => void) {
    try {
      return Notifications.addNotificationResponseReceivedListener(onTap);
    } catch (err) {
      console.warn('Could not add notification response listener:', err);
      return { remove: () => {} };
    }
  }

  /**
   * Display Local Notification immediately on device (System Popup & Banner)
   */
  static async displayLocalNotification(title: string, body: string, data?: Record<string, any>) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Failed to present local notification:', err);
    }
  }
}
