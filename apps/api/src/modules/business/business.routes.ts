import { Router } from 'express';
import { BusinessController } from './business.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.get('/:businessId/profile', BusinessController.getProfile);
router.put('/:businessId/profile', authenticateToken, BusinessController.updateProfile);

// Business Webhook Management
router.post('/webhooks', authenticateToken, BusinessController.createWebhook);
router.get('/webhooks', authenticateToken, BusinessController.getWebhooks);
router.delete('/webhooks/:id', authenticateToken, BusinessController.deleteWebhook);

// Business Hours & Quick Replies
router.post('/hours', authenticateToken, BusinessController.updateHours);
router.get('/:businessId/hours', BusinessController.getHours);
router.post('/quick-replies', authenticateToken, BusinessController.createQuickReply);
router.get('/quick-replies', authenticateToken, BusinessController.getQuickReplies);
router.delete('/quick-replies/:id', authenticateToken, BusinessController.deleteQuickReply);

export default router;
