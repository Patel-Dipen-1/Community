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

export default router;

