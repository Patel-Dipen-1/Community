import { Router } from 'express';
import { StoreController } from './store.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply Authentication Middleware to Store routes
router.use(authenticateToken);

// GET /api/v1/store/me - Authenticated owner store profile & stats
router.get('/me', StoreController.getOwnerStore);

// PUT /api/v1/store/me - Update owner store profile
router.put('/me', StoreController.updateOwnerStore);

// GET /api/v1/store/:id - Public/Authorized store view
router.get('/:id', StoreController.getPublicStore);

export default router;
