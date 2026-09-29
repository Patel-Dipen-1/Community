import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);
router.post('/request-deletion', authenticateToken, UserController.requestDeletion);

export default router;
