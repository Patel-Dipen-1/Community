import { Router } from 'express';
import { GroupController } from './group.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// List all groups
router.get('/', authenticateToken, GroupController.getAll);

// Create Group or Broadcast Channel (Approved Users Only)
router.post('/', authenticateToken, GroupController.create);

// Get Group Details with Privacy Masking (Messages & Member List)
router.get('/:id', authenticateToken, GroupController.getDetails);

// Join Group (Enforces Super Admin Capacity Limit e.g. Max 40)
router.post('/:id/join', authenticateToken, GroupController.join);

// Get Member Add Suggestions for Group Admin (Filtered by Admin's Communities & Search)
router.get('/:id/suggested-members', authenticateToken, GroupController.getSuggestedMembers);

// Bulk Add Selected Members by Group Admin
router.post('/:id/members/bulk', authenticateToken, GroupController.bulkAddMembers);

// Add Member to Group by Admin
router.post('/:id/members', authenticateToken, GroupController.addMember);

// Remove Member or Leave Group
router.delete('/:id/members/:userId', authenticateToken, GroupController.removeMember);

// Promote Member to Group Admin (Approved Users Only)
router.put('/:id/members/:userId/promote', authenticateToken, GroupController.promoteMember);

// Demote Group Admin to Member
router.put('/:id/members/:userId/demote', authenticateToken, GroupController.demoteMember);

// Send Group Message (Rule Check + Privacy Filter)
router.post('/:id/messages', authenticateToken, GroupController.sendMessage);

// Edit Group Message
router.put('/messages/:id', authenticateToken, GroupController.editMessage);

// Leave Group
router.post('/:id/leave', authenticateToken, GroupController.leave);

// Update Group Privacy Settings (Group Admin Only: hideMemberIdentity, membersCanSeeMemberList)
router.put('/:id/settings', authenticateToken, GroupController.updateSettings);

// Delete Group (Group Admin Only -> Disbands group for all members)
router.delete('/:id', authenticateToken, GroupController.deleteGroup);

// Global Default Capacity Limit (Get & Update)
router.get('/global-capacity', GroupController.getGlobalCapacity);
router.post('/global-capacity', authenticateToken, GroupController.updateGlobalCapacity);

// Super Admin Update Specific Group Capacity Limit
router.put('/:id/capacity', authenticateToken, GroupController.updateCapacity);

export default router;

