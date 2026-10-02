import { Router } from 'express';
import { StatusController } from './status.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Category Config for Status Creation (Rules 3, 4, 5)
router.get('/my-poster-config', authenticateToken, StatusController.getPosterConfig);

// Post Status (Rule 1 Approval + Rules 2, 3, 4, 5 Category Assignment)
router.post('/create', authenticateToken, StatusController.create);

// Get Targeted Status Feed (Rules 2, 6, 7, 8 & Rule 10 Super Admin View)
router.get('/feed', authenticateToken, StatusController.getFeed);

// Record View on Status (Rule 9 View Tracking)
router.post('/:id/view', authenticateToken, StatusController.recordView);

// Get Viewers List for Poster (Rule 9 Viewers Analytics & Rule 10)
router.get('/:id/viewers', authenticateToken, StatusController.getViewers);

// Delete Status
router.delete('/:id', authenticateToken, StatusController.delete);

// Mute / Unmute Contact Statuses
router.post('/users/:id/mute', authenticateToken, StatusController.toggleMute);

export default router;
