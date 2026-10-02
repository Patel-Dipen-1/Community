import { Router } from 'express';
import { BroadcastController } from './broadcast.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply Authentication Middleware to all Broadcast routes
router.use(authenticateToken);

// Create Broadcast List
router.post('/broadcasts', BroadcastController.createBroadcastList);

// Get User Broadcast Lists
router.get('/broadcasts', BroadcastController.getUserBroadcastLists);

// Get Single Broadcast List Details
router.get('/broadcasts/:id', BroadcastController.getBroadcastDetails);

// Update Broadcast List (Title, Description, Recipients)
router.put('/broadcasts/:id', BroadcastController.updateBroadcastList);

// Add Recipients to Broadcast List
router.post('/broadcasts/:id/recipients', BroadcastController.addRecipients);

// Remove Recipients from Broadcast List
router.delete('/broadcasts/:id/recipients', BroadcastController.removeRecipients);

// Duplicate Broadcast List
router.post('/broadcasts/:id/duplicate', BroadcastController.duplicateBroadcastList);

// Delete Broadcast List
router.delete('/broadcasts/:id', BroadcastController.deleteBroadcastList);

// Send Broadcast Message to List Recipients
router.post('/broadcasts/:id/send', BroadcastController.sendBroadcastMessage);

export default router;
