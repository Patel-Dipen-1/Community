import { prisma } from '@b2b/database';

export interface AuthorizationCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'FEATURE_DISABLED' | 'API_DISABLED' | 'PERMISSION_DENIED' | 'LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_REQUIRED';
}

export class AuthorizationService {
  /**
   * Evaluate API Route Access & Feature Flags
   */
  static async checkApiRouteAccess(
    userId: string | undefined,
    routePath: string,
    method: string,
    platform: 'WEB' | 'MOBILE' = 'WEB'
  ): Promise<AuthorizationCheckResult> {
    try {
      // 1. Check User API Route Override if logged in
      if (userId) {
        const userApiOverride = await prisma.userApiOverride.findFirst({
          where: {
            userId,
            routePath,
            method: { in: [method.toUpperCase(), 'ALL'] },
          },
        });
        if (userApiOverride) {
          if (userApiOverride.isEnabled) {
            return { allowed: true };
          } else {
            return { allowed: false, code: 'API_DISABLED', reason: `API route ${routePath} disabled for this account` };
          }
        }
      }

      // 2. Check Global API Route Flag
      const apiRouteFlag = await prisma.apiRouteFlag.findFirst({
        where: {
          path: routePath,
          method: { in: [method.toUpperCase(), 'ALL'] },
        },
      });

      if (apiRouteFlag) {
        if (!apiRouteFlag.isEnabled) {
          return { allowed: false, code: 'API_DISABLED', reason: `API route ${routePath} is globally disabled` };
        }
        if (platform === 'WEB' && !apiRouteFlag.webEnabled) {
          return { allowed: false, code: 'API_DISABLED', reason: `API route ${routePath} disabled on Web` };
        }
        if (platform === 'MOBILE' && !apiRouteFlag.mobileEnabled) {
          return { allowed: false, code: 'API_DISABLED', reason: `API route ${routePath} disabled on Mobile` };
        }
      }

      return { allowed: true };
    } catch (err: any) {
      return { allowed: true };
    }
  }

  /**
   * Centralized Dynamic Authorization Evaluation
   * Hierarchy: Platform Setting -> Feature Flag -> User Override -> Role Permission -> Plan Access
   */
  static async checkUserPermission(
    userId: string,
    permissionKey: string,
    featureKey: string,
    platform: 'WEB' | 'MOBILE' = 'WEB'
  ): Promise<AuthorizationCheckResult> {
    try {
      // 1. Fetch User details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          business: true,
          subscription: true,
        },
      });

      if (!user) {
        return { allowed: false, code: 'PERMISSION_DENIED', reason: 'USER_NOT_FOUND' };
      }

      // SUPER_ADMIN role bypasses standard feature/role permission restrictions
      const isSuperAdmin =
        user.email === 'dnpatel2002@gmail.com' ||
        user.business?.assignedRole === 'SUPER_ADMIN';

      if (isSuperAdmin) {
        return { allowed: true };
      }

      // 2. Check System Maintenance Mode
      const maintenanceSetting = await prisma.dynamicPlatformSetting.findUnique({
        where: { key: 'MAINTENANCE_MODE' },
      });
      if (maintenanceSetting && maintenanceSetting.value === true) {
        return { allowed: false, code: 'API_DISABLED', reason: 'SYSTEM_MAINTENANCE_MODE' };
      }

      // 3. Evaluate User-Specific Feature Override
      const userFeatureOverride = await prisma.userFeatureOverride.findUnique({
        where: { userId_featureKey: { userId, featureKey } },
      });

      if (userFeatureOverride) {
        if (!userFeatureOverride.isEnabled) {
          return { allowed: false, code: 'FEATURE_DISABLED', reason: `Feature ${featureKey} disabled for account` };
        }
      } else {
        // Evaluate Dynamic Feature Flag
        const feature = await prisma.feature.findUnique({
          where: { key: featureKey },
        });

        if (feature) {
          if (!feature.isEnabled) {
            return { allowed: false, code: 'FEATURE_DISABLED', reason: `FEATURE_DISABLED: ${feature.name} is currently disabled` };
          }
          if (platform === 'WEB' && !feature.webEnabled) {
            return { allowed: false, code: 'FEATURE_DISABLED', reason: `FEATURE_DISABLED_WEB: ${feature.name} disabled on Web` };
          }
          if (platform === 'MOBILE' && !feature.mobileEnabled) {
            return { allowed: false, code: 'FEATURE_DISABLED', reason: `FEATURE_DISABLED_MOBILE: ${feature.name} disabled on Mobile` };
          }
        }
      }

      // 4. Evaluate User-Specific Permission Overrides
      const userOverride = await prisma.userPermissionOverride.findUnique({
        where: {
          userId_permissionKey: { userId, permissionKey },
        },
      });

      if (userOverride) {
        if (userOverride.isGranted) {
          return { allowed: true };
        } else {
          return { allowed: false, code: 'PERMISSION_DENIED', reason: 'PERMISSION_DENIED_USER_OVERRIDE' };
        }
      }

      // 5. Evaluate Role Permissions
      const assignedUserRoles = await prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true },
      });

      const roleIds: string[] = assignedUserRoles.map((ur) => ur.roleId);

      const primaryRoleName = user.business?.assignedRole || 'USER';
      const defaultRole = await prisma.customRole.findUnique({
        where: { name: primaryRoleName },
      });
      if (defaultRole && !roleIds.includes(defaultRole.id)) {
        roleIds.push(defaultRole.id);
      }

      if (roleIds.length > 0) {
        const matchingPermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: { in: roleIds },
            permissionKey,
          },
        });

        if (matchingPermission) {
          return { allowed: true };
        }
      }

      // 6. Check Subscription Plan Feature Access
      if (user.subscription) {
        const planSlug = user.subscription.planName.toLowerCase();
        const plan = await prisma.dynamicSubscriptionPlan.findUnique({
          where: { slug: planSlug },
          include: { planFeatures: true },
        });

        if (plan) {
          const planFeature = plan.planFeatures.find((pf) => pf.featureKey === featureKey);
          if (planFeature && !planFeature.isEnabled) {
            return { allowed: false, code: 'SUBSCRIPTION_REQUIRED', reason: 'PLAN_FEATURE_RESTRICTED' };
          }
        }
      }

      return { allowed: false, code: 'PERMISSION_DENIED', reason: `PERMISSION_DENIED: Missing permission ${permissionKey}` };
    } catch (err: any) {
      return { allowed: false, code: 'PERMISSION_DENIED', reason: `AUTHZ_ERROR: ${err.message}` };
    }
  }

  /**
   * Evaluate Dynamic Limits Behavior
   * If Limit Flag OFF -> Do NOT enforce limit (Unrestricted / default behavior)
   * If Limit Flag ON -> Enforce limit against User Override -> Plan Limit -> Role Limit -> Platform Limit
   */
  static async evaluateUserLimit(
    userId: string,
    limitKey: string,
    currentUsage: number
  ): Promise<{ isAllowed: boolean; isEnforced: boolean; max: number; usage: number; remaining: number }> {
    try {
      // Fetch Platform Limit Config
      const platformLimit = await prisma.platformLimit.findUnique({
        where: { limitKey },
      });

      // Check if Limit Flag is OFF globally
      if (platformLimit && !platformLimit.isEnabled) {
        return {
          isAllowed: true,
          isEnforced: false,
          max: 999999,
          usage: currentUsage,
          remaining: 999999,
        };
      }

      let maxLimit = platformLimit?.defaultValue || 0;

      // 1. User Limit Override
      const userOverride = await prisma.userLimitOverride.findUnique({
        where: { userId_limitKey: { userId, limitKey } },
      });

      if (userOverride) {
        if (userOverride.isEnabled === false) {
          return { isAllowed: true, isEnforced: false, max: 999999, usage: currentUsage, remaining: 999999 };
        }
        maxLimit = userOverride.value;
      } else {
        // 2. Role Limit
        const assignedRoles = await prisma.userRoleAssignment.findMany({
          where: { userId },
          select: { roleId: true },
        });
        const roleIds = assignedRoles.map((r) => r.roleId);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { business: true },
        });
        const primaryRoleName = user?.business?.assignedRole || 'USER';
        const defaultRole = await prisma.customRole.findUnique({ where: { name: primaryRoleName } });
        if (defaultRole && !roleIds.includes(defaultRole.id)) {
          roleIds.push(defaultRole.id);
        }

        const roleLimit = await prisma.roleLimit.findFirst({
          where: { roleId: { in: roleIds }, limitKey },
        });

        if (roleLimit) {
          maxLimit = roleLimit.value;
        }
      }

      const isAllowed = maxLimit === 0 || currentUsage < maxLimit;
      const remaining = maxLimit === 0 ? 999999 : Math.max(0, maxLimit - currentUsage);

      return {
        isAllowed,
        isEnforced: true,
        max: maxLimit,
        usage: currentUsage,
        remaining,
      };
    } catch {
      return { isAllowed: true, isEnforced: false, max: 999999, usage: currentUsage, remaining: 999999 };
    }
  }

  /**
   * Record Super Admin Audit Action Log
   */
  static async logAudit(params: {
    adminUserId: string;
    adminName: string;
    action: string;
    targetResource: string;
    targetId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          adminUserId: params.adminUserId,
          adminName: params.adminName || 'Super Admin',
          action: params.action,
          targetResource: params.targetResource,
          targetId: params.targetId,
          oldValue: params.oldValue ? params.oldValue : undefined,
          newValue: params.newValue ? params.newValue : undefined,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err: any) {
      console.error('Audit log error:', err.message);
    }
  }
}
