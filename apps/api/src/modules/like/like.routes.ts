import { Router } from 'express';
import { LikeController } from './like.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.post('/toggle', authenticateToken, LikeController.toggleLike);
router.get('/', authenticateToken, LikeController.getLikes);

export default router;
