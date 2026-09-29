import { Router } from 'express';
import { CommentController } from './comment.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, CommentController.createComment);
router.get('/', authenticateToken, CommentController.getComments);
router.delete('/:id', authenticateToken, CommentController.deleteComment);

export default router;
