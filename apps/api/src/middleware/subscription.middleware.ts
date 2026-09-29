import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../modules/subscription/subscription.service';

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
    const userRole = (req as any).user?.assignedRole;
    const userEmail = (req as any).user?.email;
    if (userEmail === 'dnpatel2002@gmail.com' || userRole === 'SUPER_ADMIN') {
      return next();
    }

    const { subscription } = await SubscriptionService.getUserSubscription(userId);

    // If trial is disabled by Super Admin and user status is TRIAL -> update/treat as active or check period
    if (!settings.freeTrialEnabled && subscription.status === 'TRIAL') {
      // Trial is OFF: User needs active subscription if payment is enabled
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
