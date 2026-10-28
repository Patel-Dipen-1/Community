import { prisma } from '@b2b/database';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;

function initFirebaseAdmin() {
  if (isFirebaseInitialized || getApps().length > 0) return;

  try {
    const serviceAccountPath = path.join(__dirname, '../../config/firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    }
  } catch (err) {
    console.error('⚠️ Failed to initialize Firebase Admin SDK:', err);
  }
}

// Initialise Firebase Admin on module load
initFirebaseAdmin();

export class PushNotificationService {
  /**
   * Check if Push Notifications are globally enabled by Super Admin or Firebase Credentials exist
   */
  static async isGloballyEnabled() {
    initFirebaseAdmin();
    const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    const hasServiceAccount = isFirebaseInitialized || getApps().length > 0;

    return {
      enabled: setting?.pushNotificationsEnabled ?? true,
      hasKey: hasServiceAccount || Boolean(setting?.fcmServerKey && setting.fcmServerKey.trim().length > 0),
      fcmServerKey: setting?.fcmServerKey || (hasServiceAccount ? 'FIREBASE_SERVICE_ACCOUNT_ACTIVE' : null),
      serviceAccountActive: hasServiceAccount,
    };
  }

  /**
   * Super Admin update push notification settings (enable/disable + FCM Key)
   */
  static async updatePushConfig(enabled: boolean, fcmServerKey?: string) {
    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        pushNotificationsEnabled: enabled,
        ...(fcmServerKey !== undefined && { fcmServerKey: fcmServerKey.trim() }),
      },
      create: {
        id: 'default',
        pushNotificationsEnabled: enabled,
        fcmServerKey: fcmServerKey ? fcmServerKey.trim() : null,
      },
    });

    return {
      pushNotificationsEnabled: updated.pushNotificationsEnabled,
      hasKey: Boolean(updated.fcmServerKey || isFirebaseInitialized),
      message: `Mobile Push Notifications are now ${enabled ? 'ENABLED' : 'DISABLED'} by Super Admin.`,
    };
  }

  /**
   * Register User Device Push Token (Web, Android, iOS)
   */
  static async registerPushToken(userId: string, token: string, platform: 'WEB' | 'ANDROID' | 'IOS' = 'WEB') {
    if (!token || !token.trim()) {
      throw new Error('PUSH_TOKEN_INVALID: Device push token string is required');
    }

    const pushToken = await prisma.userPushToken.upsert({
      where: { token: token.trim() },
      update: {
        userId,
        platform,
      },
      create: {
        userId,
        token: token.trim(),
        platform,
      },
    });

    return pushToken;
  }

  /**
   * Dispatch Mobile Background Push Notification to User Devices via FCM Admin SDK
   */
  static async sendPushToUser(
    targetUserId: string,
    notification: { title: string; body: string; data?: Record<string, string> }
  ) {
    initFirebaseAdmin();

    const config = await PushNotificationService.isGloballyEnabled();
    if (!config.enabled) {
      return { sent: 0, reason: 'PUSH_DISABLED_BY_ADMIN' };
    }

    const tokens = await prisma.userPushToken.findMany({
      where: { userId: targetUserId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return { sent: 0, reason: 'NO_DEVICE_TOKENS' };
    }

    const tokenStrings = tokens.map((t) => t.token);

    // BUG-047: Partition Expo tokens from native FCM tokens to prevent duplicate deliveries
    const expoTokens = tokenStrings.filter((t) => t.includes('ExponentPushToken') || t.includes('ExpoPushToken'));
    const fcmTokens = tokenStrings.filter((t) => !t.includes('ExponentPushToken') && !t.includes('ExpoPushToken'));

    let expoSentCount = 0;
    if (expoTokens.length > 0) {
      try {
        const expoMessages = expoTokens.map((to) => ({
          to,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          badge: 1,
          channelId: 'default',
          priority: 'high',
        }));

        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages),
        });
        if (expoRes.ok) {
          expoSentCount = expoTokens.length;
        }
      } catch (err) {
        console.error('Expo Push notification error:', err);
      }
    }

    // Primary: Send non-Expo tokens via official Firebase Admin SDK (HTTP v1)
    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;
    if (fcmTokens.length > 0 && getApps().length > 0) {
      try {
        const response = await getMessaging().sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data || {},
        });

        fcmSuccessCount = response.successCount;
        fcmFailureCount = response.failureCount;
      } catch (err: any) {
        console.error('FCM Multicast delivery error:', err);
      }
    } else if (fcmTokens.length > 0 && getApps().length === 0) {
      // BUG-044: Notice that Google deprecated & shut down Legacy HTTP API (fcm.googleapis.com/fcm/send)
      console.warn('Firebase Admin SDK is not initialized; FCM native tokens cannot be delivered without active Firebase configuration.');
    }

    return {
      sent: expoSentCount + fcmSuccessCount,
      totalTokens: tokens.length,
      failures: fcmFailureCount,
    };
  }
}
