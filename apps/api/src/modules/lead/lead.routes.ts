import { Router } from 'express';
import { LeadController } from './lead.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Category Config for Lead Creation (Rules 2, 3, 4)
router.get('/my-category-config', authenticateToken, LeadController.getCategoryConfig);

// Create Lead (Rule 1 Approval + Rules 2-4 Category Assignment + Rule 8 Batching)
router.post('/capture-lead', authenticateToken, LeadController.capture);

// Click / View Lead (Rule 9 Batch Rotation)
router.post('/:id/click', authenticateToken, LeadController.click);

// Get My Leads / Inquiries (Rules 5, 6, 7 & Rule 10 Super Admin Overview)
router.get('/my-inquiries', authenticateToken, LeadController.getMyLeads);
router.get('/my-leads', authenticateToken, LeadController.getMyLeads);

// Super Admin Lead Rule & Batch Management (Rule 10)
router.patch('/:id/admin-manage', authenticateToken, LeadController.adminManage);

export default router;
