import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../storage/authStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class PushNotificationService {
  /**
   * Register device push notification token with backend API
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
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

      const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
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
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default Business Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#818cf8',
        });
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
    return Notifications.addNotificationResponseReceivedListener(onTap);
  }
}
