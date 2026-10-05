import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply Authentication Middleware to all Chat routes
router.use(authenticateToken);

// Search APPROVED users by mobile/name/shop
router.get('/users/search', ChatController.searchUsers);

// Get user's active conversations list
router.get('/conversations', ChatController.getConversations);

// Initialize or retrieve conversation with another APPROVED user
router.post('/conversations', ChatController.getOrCreateConversation);

// Get messages for a specific conversation
router.get('/conversations/:id/messages', ChatController.getMessages);

// Send message to an existing conversation or directly
router.post('/conversations/:id/messages', ChatController.sendMessage);
router.post('/messages', ChatController.sendMessage);

// React to a message
router.post('/messages/:id/react', ChatController.reactToMessage);

// Edit a direct message
router.put('/messages/:id', ChatController.editMessage);

// Soft delete a direct message
router.delete('/messages/:id', ChatController.deleteMessage);

// Block/Unblock a user
router.post('/users/:id/block', ChatController.toggleBlockUser);

// Update conversation settings (Pin/Archive/Mute)
router.put('/conversations/:id/settings', ChatController.updateSettings);

// Fetch LiveKit Short-Lived Access Token for Audio/Video RTC Room
router.post('/livekit-token', ChatController.getLiveKitToken);

// Interactive Polls
router.post('/polls', ChatController.createPoll);
router.post('/polls/:id/vote', ChatController.votePoll);
router.get('/polls/:id', ChatController.getPoll);

// Star / Bookmark Messages
router.post('/messages/:id/star', ChatController.toggleStarMessage);
router.get('/starred-messages', ChatController.getStarredMessages);

export default router;


