import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticateToken, requireSuperAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Public / Authenticated: Get current subscription & payment settings
router.get('/settings', SubscriptionController.getSettings);

// Public / Authenticated: Get available dynamic payment cycles/plans
router.get('/cycles', SubscriptionController.getPaymentCycles);

// Super Admin: Create new payment cycle/plan
router.post('/admin/cycles', authenticateToken, requireSuperAdmin, SubscriptionController.createPaymentCycle);

// Super Admin: Update payment cycle/plan
router.put('/admin/cycles/:id', authenticateToken, requireSuperAdmin, SubscriptionController.updatePaymentCycle);

// Super Admin: Delete payment cycle/plan
router.delete('/admin/cycles/:id', authenticateToken, requireSuperAdmin, SubscriptionController.deletePaymentCycle);

// Super Admin: Update subscription & payment gateway settings
router.put('/admin/settings', authenticateToken, requireSuperAdmin, SubscriptionController.updateSettings);

// Authenticated User: Get subscription details, active cycles, & payment history
router.get('/me', authenticateToken, SubscriptionController.getMySubscription);

// Authenticated User: Submit Manual Payment Screenshot
router.post('/manual-payment', authenticateToken, SubscriptionController.submitManualPayment);

// Authenticated User: Process Gateway Payment (Razorpay / Stripe)
router.post('/subscribe', authenticateToken, SubscriptionController.subscribe);

// Super Admin: Payment Management Dashboard (Metrics & Transactions)
router.get('/admin/payments', authenticateToken, requireSuperAdmin, SubscriptionController.getPaymentDashboard);

// Super Admin: Approve Manual Payment
router.post('/admin/approve-payment', authenticateToken, requireSuperAdmin, SubscriptionController.approvePayment);

// Super Admin: Reject Manual Payment
router.post('/admin/reject-payment', authenticateToken, requireSuperAdmin, SubscriptionController.rejectPayment);

export default router;
