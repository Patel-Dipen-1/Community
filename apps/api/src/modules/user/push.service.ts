import { prisma } from '@b2b/database';

export class PushNotificationService {
  /**
   * Check if Push Notifications are globally enabled by Super Admin
   */
  static async isGloballyEnabled() {
    const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    return {
      enabled: setting?.pushNotificationsEnabled ?? false,
      hasKey: Boolean(setting?.fcmServerKey && setting.fcmServerKey.trim().length > 0),
      fcmServerKey: setting?.fcmServerKey || null,
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
      hasKey: Boolean(updated.fcmServerKey),
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
   * Dispatch Mobile Background Push Notification to User Devices via FCM v1 HTTP API
   */
  static async sendPushToUser(
    targetUserId: string,
    notification: { title: string; body: string; data?: Record<string, string> }
  ) {
    const config = await PushNotificationService.isGloballyEnabled();
    if (!config.enabled || !config.hasKey || !config.fcmServerKey) {
      // Push notifications disabled by Super Admin or FCM server key missing
      return { sent: 0, reason: 'PUSH_DISABLED_OR_NO_KEY' };
    }

    const tokens = await prisma.userPushToken.findMany({
      where: { userId: targetUserId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return { sent: 0, reason: 'NO_DEVICE_TOKENS' };
    }

    let successCount = 0;
    for (const t of tokens) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${config.fcmServerKey}`,
          },
          body: JSON.stringify({
            to: t.token,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: notification.data || {},
            priority: 'high',
          }),
        });

        if (response.ok) successCount++;
      } catch (err) {
        // Ignore single device delivery errors
      }
    }

    return { sent: successCount, totalTokens: tokens.length };
  }
}
