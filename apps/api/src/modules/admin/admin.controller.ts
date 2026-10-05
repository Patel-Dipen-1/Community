import { Request, Response } from 'express';
import { ApproveVerificationSchema, TerminateSessionSchema, AssignCommunitiesSchema, UpdateGroupCapacitySchema } from './admin.validation';
import { AdminService } from './admin.service';
import { GroupService } from '../group/group.service';
import { parsePaginationParams } from '../../utils/pagination';

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getAllUsers(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const result = await AdminService.createUser(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.updateUser(userId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getQueue(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getVerificationQueue(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const { userId, assignedCategory, assignedRole } = req.body;
      const result = await AdminService.approveVerification(
        userId,
        assignedCategory || 'general',
        assignedRole || 'WHOLESALER'
      );
      res.json({
        message: `Account approved successfully. "Verified Business" tag granted for ${assignedCategory || 'general'} as ${assignedRole || 'WHOLESALER'}.`,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const result = await AdminService.rejectVerification(userId);
      res.json({ message: 'Registration rejected', ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getActiveSessions(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = TerminateSessionSchema.parse(req.body);
      const result = await AdminService.terminateSession(sessionId);
      res.json({
        message: `Session ${sessionId} terminated successfully. Device logged out immediately.`,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async terminateAllSessions(req: Request, res: Response) {
    try {
      const result = await AdminService.terminateAllSessions();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getDeletionRequests(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getDeletionRequests(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.deleteAccount(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async editBusiness(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.adminEditBusiness(id, req.body);
      res.json({ message: 'Business updated by Super Admin', business: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async assignCommunities(req: Request, res: Response) {
    try {
      const { businessId, allowedCommunities } = AssignCommunitiesSchema.parse(req.body);
      const result = await AdminService.assignCommunities(businessId, allowedCommunities);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async updateGroupCapacity(req: Request, res: Response) {
    try {
      const { groupId, maxCapacity } = req.body;
      if (groupId) {
        const result = await AdminService.updateGroupCapacity(groupId, Number(maxCapacity));
        res.json(result);
      } else if (maxCapacity !== undefined) {
        const newCapacity = GroupService.setGlobalGroupCapacity(Number(maxCapacity));
        res.json({
          message: `Super Admin set default global group capacity limit to ${newCapacity} members.`,
          maxCapacity: newCapacity,
        });
      } else {
        res.status(400).json({ error: 'maxCapacity is required' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  // ---------------- DYNAMIC COMMUNITY & CATEGORY CRUD CONTROLLERS ----------------

  static async getCommunities(req: Request, res: Response) {
    try {
      const communities = await AdminService.getCommunities();
      res.json({ communities, data: communities });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createCommunity(req: Request, res: Response) {
    try {
      const result = await AdminService.createCommunity(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCommunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.updateCommunity(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCommunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteCommunity(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async allocateCommunitiesToUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { allowedCommunities } = req.body;
      const result = await AdminService.allocateCommunitiesToUser(userId, allowedCommunities);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async toggle2FA(req: Request, res: Response) {
    try {
      const { enabled } = req.body;
      const { TwoFactorService } = await import('../user/twoFactor.service');
      const result = await TwoFactorService.toggleGlobal2FA(Boolean(enabled));
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async togglePushConfig(req: Request, res: Response) {
    try {
      const { enabled, fcmServerKey } = req.body;
      const { PushNotificationService } = await import('../user/push.service');
      const result = await PushNotificationService.updatePushConfig(Boolean(enabled), fcmServerKey);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- DYNAMIC FEATURES & MODULES CONTROLLERS ----------------
  static async getModulesAndFeatures(req: Request, res: Response) {
    try {
      const result = await AdminService.getModulesAndFeatures();
      res.json({ success: true, modules: result, data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggleFeature(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { isEnabled } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.toggleFeature(key, Boolean(isEnabled), adminUserId);
      res.json({ success: true, feature: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateFeature(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.updateFeature(key, req.body, adminUserId);
      res.json({ success: true, feature: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- DYNAMIC ROLES & PERMISSIONS CONTROLLERS ----------------
  static async getPermissions(req: Request, res: Response) {
    try {
      const permissions = await AdminService.getPermissions();
      res.json({ success: true, permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCustomRoles(req: Request, res: Response) {
    try {
      const roles = await AdminService.getCustomRoles();
      res.json({ success: true, roles });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createOrUpdateCustomRole(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const role = await AdminService.createOrUpdateCustomRole(req.body, adminUserId);
      res.json({ success: true, role });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async assignUserRole(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.assignUserRole(userId, roleId, adminUserId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getUserPermissionsAndOverrides(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.getUserPermissionsAndOverrides(userId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setUserPermissionOverride(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { permissionKey, featureKey, isGranted } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.setUserPermissionOverride(userId, permissionKey, featureKey, Boolean(isGranted), adminUserId);
      res.json({ success: true, override: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async removeUserPermissionOverride(req: Request, res: Response) {
    try {
      const { userId, permissionKey } = req.params;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.removeUserPermissionOverride(userId, permissionKey, adminUserId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- DYNAMIC LIMITS CONTROLLERS ----------------
  static async getPlatformLimits(req: Request, res: Response) {
    try {
      const limits = await AdminService.getPlatformLimits();
      res.json({ success: true, limits });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePlatformLimit(req: Request, res: Response) {
    try {
      const { limitKey } = req.params;
      const { defaultValue } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.updatePlatformLimit(limitKey, Number(defaultValue), adminUserId);
      res.json({ success: true, limit: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setRoleLimit(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { limitKey, value } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.setRoleLimit(roleId, limitKey, Number(value), adminUserId);
      res.json({ success: true, limit: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setUserLimitOverride(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limitKey, value } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const result = await AdminService.setUserLimitOverride(userId, limitKey, Number(value), adminUserId);
      res.json({ success: true, limit: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- DYNAMIC PLANS & SETTINGS CONTROLLERS ----------------
  static async getDynamicSubscriptionPlans(req: Request, res: Response) {
    try {
      const plans = await AdminService.getDynamicSubscriptionPlans();
      res.json({ success: true, plans });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createOrUpdateSubscriptionPlan(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const plan = await AdminService.createOrUpdateSubscriptionPlan(req.body, adminUserId);
      res.json({ success: true, plan });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getDynamicPlatformSettings(req: Request, res: Response) {
    try {
      const settings = await AdminService.getDynamicPlatformSettings();
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateDynamicPlatformSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const adminUserId = (req as any).user?.userId || 'system_admin';
      const setting = await AdminService.updateDynamicPlatformSetting(key, value, adminUserId);
      res.json({ success: true, setting });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit || 100);
      const logs = await AdminService.getAuditLogs(limit);
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---------------- DASHBOARD STATS & HEALTH CONTROLLERS ----------------
  static async getRealTimeDashboardStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getRealTimeDashboardStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getSystemHealthMetrics(req: Request, res: Response) {
    try {
      const health = await AdminService.getSystemHealthMetrics();
      res.json({ success: true, health });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---------------- API ROUTE FLAGS & USER OVERRIDES CONTROLLERS ----------------
  static async getApiRouteFlags(req: Request, res: Response) {
    try {
      const routes = await AdminService.getApiRouteFlags();
      res.json({ success: true, routes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateApiRouteFlag(req: Request, res: Response) {
    try {
      const path = decodeURIComponent(req.params.path || req.query.path as string);
      const result = await AdminService.updateApiRouteFlag(path, req.body);
      res.json({ success: true, route: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setUserFeatureOverride(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { featureKey, isEnabled } = req.body;
      const result = await AdminService.setUserFeatureOverride(userId, featureKey, Boolean(isEnabled));
      res.json({ success: true, override: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setUserApiOverride(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { routePath, method, isEnabled } = req.body;
      const result = await AdminService.setUserApiOverride(userId, routePath, method, Boolean(isEnabled));
      res.json({ success: true, override: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}



