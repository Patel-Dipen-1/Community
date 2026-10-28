import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../modules/subscription/subscription.service';
import { isSuperAdminUser } from '../utils/superAdmin';

export const verifySubscriptionAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SubscriptionService.getSystemSettings();

    // 1. IF SUBSCRIPTION SYSTEM IS DISABLED (OFF) -> BYPASS COMPLETELY!
    if (!settings.subscriptionSystemEnabled) {
      return next();
    }

    // 2. IF SUBSCRIPTION SYSTEM IS ENABLED (ON) -> EVALUATE USER SUBSCRIPTION
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return next(); // Let auth middleware handle unauthenticated users
    }

    // Super Admin bypass
    if (isSuperAdminUser((req as any).user)) {
      return next();
    }

    const { subscription } = await SubscriptionService.getUserSubscription(userId);

    // If trial is disabled by Super Admin and user status is TRIAL -> reject access
    if (!settings.freeTrialEnabled && subscription.status === 'TRIAL') {
      return res.status(402).json({
        error: 'TRIAL_DISABLED',
        message: 'Free trials are currently disabled. An active subscription is required to access platform features.',
        settings,
      });
    }

    // If status is EXPIRED
    if (subscription.status === 'EXPIRED') {
      return res.status(402).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your platform subscription has expired. Please renew your subscription to access premium features.',
        settings,
      });
    }

    next();
  } catch (err: any) {
    // Graceful fallback to avoid blocking user if error occurs
    next();
  }
};
