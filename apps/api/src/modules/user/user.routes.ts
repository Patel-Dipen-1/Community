import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);
router.post('/request-deletion', authenticateToken, UserController.requestDeletion);

// Granular Privacy Settings & Call Log History
router.get('/privacy', authenticateToken, UserController.getPrivacy);
router.put('/privacy', authenticateToken, UserController.updatePrivacy);
router.get('/call-history', authenticateToken, UserController.getCallHistory);
router.post('/call-log', authenticateToken, UserController.logCall);

// End-to-End Encryption (E2EE) Key Exchange
router.post('/security/keys', authenticateToken, UserController.registerE2EEKeys);
router.get('/security/keys/:userId', authenticateToken, UserController.getE2EEKeys);

// Encrypted Chat History Backup & Restore
router.post('/backup/export', authenticateToken, UserController.exportBackup);
router.post('/backup/restore', authenticateToken, UserController.restoreBackup);

// Two-Factor Authentication (2FA / OTP)
router.post('/2fa/setup', authenticateToken, UserController.setup2FA);
router.post('/2fa/verify', authenticateToken, UserController.verify2FA);
router.get('/2fa/status', authenticateToken, UserController.get2FAStatus);

// Mobile Push Notification Token Registration
router.post('/push-token', authenticateToken, UserController.registerPushToken);
router.get('/push-config', authenticateToken, UserController.getPushConfig);

export default router;
