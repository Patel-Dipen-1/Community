import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AuthorizationService } from '../modules/admin/authz.service';

/**
 * Middleware: Global API Route Flag Guard
 */
export const requireApiRoute = (routePath: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const platformHeader = (req.headers['x-platform'] as string)?.toUpperCase();
      const platform = platformHeader === 'MOBILE' ? 'MOBILE' : 'WEB';

      const check = await AuthorizationService.checkApiRouteAccess(
        userId,
        routePath,
        req.method,
        platform
      );

      if (!check.allowed) {
        return res.status(403).json({
          code: check.code || 'API_DISABLED',
          error: check.reason || `API Route ${routePath} is disabled`,
          routePath,
        });
      }

      next();
    } catch (err: any) {
      next();
    }
  };
};

/**
 * Middleware: Granular Feature & Permission Guard
 */
export const requirePermission = (permissionKey: string, featureKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Authentication token required' });
      }

      const platformHeader = (req.headers['x-platform'] as string)?.toUpperCase();
      const platform = platformHeader === 'MOBILE' ? 'MOBILE' : 'WEB';

      const check = await AuthorizationService.checkUserPermission(
        userId,
        permissionKey,
        featureKey,
        platform
      );

      if (!check.allowed) {
        return res.status(403).json({
          code: check.code || 'PERMISSION_DENIED',
          error: check.reason || 'Insufficient permissions',
          permissionKey,
          featureKey,
        });
      }

      next();
    } catch (err: any) {
      res.status(500).json({ code: 'AUTHZ_ERROR', error: err.message });
    }
  };
};

/**
 * Middleware: Feature Flag Guard
 */
export const requireFeature = (featureKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Authentication token required' });
      }

      const check = await AuthorizationService.checkUserPermission(
        userId,
        'VIEW',
        featureKey
      );

      if (!check.allowed) {
        return res.status(403).json({
          code: check.code || 'FEATURE_DISABLED',
          error: check.reason || `Feature ${featureKey} is disabled`,
          featureKey,
        });
      }

      next();
    } catch (err: any) {
      res.status(500).json({ code: 'FEATURE_GUARD_ERROR', error: err.message });
    }
  };
};

/**
 * Middleware: Dynamic Resource Limit Guard
 */
export const requireLimitGuard = (limitKey: string, currentUsageGetter: (req: AuthenticatedRequest) => number) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Authentication token required' });
      }

      const currentUsage = currentUsageGetter(req);
      const limitCheck = await AuthorizationService.evaluateUserLimit(userId, limitKey, currentUsage);

      if (limitCheck.isEnforced && !limitCheck.isAllowed) {
        return res.status(429).json({
          code: 'LIMIT_EXCEEDED',
          error: `Resource capacity limit exceeded for ${limitKey}`,
          limitKey,
          maxAllowed: limitCheck.max,
          currentUsage: limitCheck.usage,
          remainingQuota: limitCheck.remaining,
        });
      }

      next();
    } catch (err: any) {
      res.status(500).json({ code: 'LIMIT_GUARD_ERROR', error: err.message });
    }
  };
};
