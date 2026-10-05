import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticateToken, requireSuperAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Super Admin User Management (User CRUD)
router.get('/users', AdminController.getAllUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:userId', AdminController.updateUser);
router.delete('/users/:userId', AdminController.deleteAccount);

// Verification Queue & Approval (Support public or authenticated access)
router.get('/verification-queue', AdminController.getQueue);
router.post('/approve-verification', AdminController.approve);
router.post('/reject-verification', AdminController.reject);

// Session Termination Guard
router.get('/sessions', AdminController.getSessions);
router.post('/terminate-session', AdminController.terminateSession);
router.post('/terminate-all-sessions', AdminController.terminateAllSessions);

// Account Deletion Request Queue & Approval
router.get('/deletion-requests', AdminController.getDeletionRequests);
router.delete('/delete-account/:userId', AdminController.deleteAccount);

// Super Admin Multi-Community Permission Grant & Override Edit
router.post('/assign-communities', AdminController.assignCommunities);
router.put('/business/:id', AdminController.editBusiness);

// Dynamic Community / Allowed Categories CRUD
router.get('/communities', AdminController.getCommunities);
router.post('/communities', AdminController.createCommunity);
router.put('/communities/:id', AdminController.updateCommunity);
router.delete('/communities/:id', AdminController.deleteCommunity);
router.post('/users/:userId/allocate-categories', AdminController.allocateCommunitiesToUser);

// Super Admin Group Capacity Configuration Endpoint
router.post('/groups/capacity', AdminController.updateGroupCapacity);

// Super Admin Global 2FA Enable/Disable Toggle
router.post('/2fa-toggle', AdminController.toggle2FA);

// Dynamic Modules & Feature Flags
router.get('/modules', AdminController.getModulesAndFeatures);
router.put('/features/:key/toggle', AdminController.toggleFeature);
router.put('/features/:key', AdminController.updateFeature);

// Dynamic Permissions & Custom Roles
router.get('/permissions', AdminController.getPermissions);
router.get('/roles', AdminController.getCustomRoles);
router.post('/roles', AdminController.createOrUpdateCustomRole);
router.post('/roles/assign', AdminController.assignUserRole);
router.get('/users/:userId/permissions', AdminController.getUserPermissionsAndOverrides);
router.post('/users/:userId/override-permission', AdminController.setUserPermissionOverride);
router.delete('/users/:userId/override-permission/:permissionKey', AdminController.removeUserPermissionOverride);

// Dynamic Platform Limits
router.get('/limits', AdminController.getPlatformLimits);
router.put('/limits/:limitKey', AdminController.updatePlatformLimit);
router.post('/roles/:roleId/limits', AdminController.setRoleLimit);
router.post('/users/:userId/override-limit', AdminController.setUserLimitOverride);

// Dynamic Subscription Plans
router.get('/subscription-plans', AdminController.getDynamicSubscriptionPlans);
router.post('/subscription-plans', AdminController.createOrUpdateSubscriptionPlan);

// Dynamic Platform Settings & Audit Logs
router.get('/settings', AdminController.getDynamicPlatformSettings);
router.put('/settings/:key', AdminController.updateDynamicPlatformSetting);
router.get('/audit-logs', AdminController.getAuditLogs);

// Real-Time Dashboard Stats & System Health
router.get('/dashboard-stats', AdminController.getRealTimeDashboardStats);
router.get('/system-health', AdminController.getSystemHealthMetrics);

// API Route Flags & Rate Limit Controls
router.get('/api-routes', AdminController.getApiRouteFlags);
router.put('/api-routes/update', AdminController.updateApiRouteFlag);

// User Feature & API Overrides
router.post('/users/:userId/override-feature', AdminController.setUserFeatureOverride);
router.post('/users/:userId/override-api', AdminController.setUserApiOverride);

export default router;


