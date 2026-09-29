import { Router } from 'express';
import { BusinessController } from './business.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.get('/:businessId/profile', BusinessController.getProfile);
router.put('/:businessId/profile', authenticateToken, BusinessController.updateProfile);

export default router;
