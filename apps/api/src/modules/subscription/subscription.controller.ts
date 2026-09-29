import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';

export class SubscriptionController {
  // Public / Authenticated: Get current System Settings
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SubscriptionService.getSystemSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Super Admin: Update Subscription System Settings & Payment Gateways
  static async updateSettings(req: Request, res: Response) {
    try {
      const updated = await SubscriptionService.updateSystemSettings(req.body);
      res.json({
        message: 'Subscription & Payment settings updated successfully',
        settings: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Public / Authenticated: Get payment cycles/plans
  static async getPaymentCycles(req: Request, res: Response) {
    try {
      const onlyActive = req.query.active === 'true';
      const cycles = await SubscriptionService.getPaymentCycles(onlyActive);
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Super Admin: Create new custom payment cycle/plan
  static async createPaymentCycle(req: Request, res: Response) {
    try {
      const cycle = await SubscriptionService.createPaymentCycle(req.body);
      res.status(201).json({
        message: 'Payment cycle plan created successfully!',
        cycle,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Super Admin: Update payment cycle/plan
  static async updatePaymentCycle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await SubscriptionService.updatePaymentCycle(id, req.body);
      res.json({
        message: 'Payment cycle plan updated successfully',
        cycle: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Super Admin: Delete payment cycle/plan
  static async deletePaymentCycle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await SubscriptionService.deletePaymentCycle(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Authenticated User: Get subscription status, settings, & transaction history
  static async getMySubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated user' });
      }

      const data = await SubscriptionService.getUserSubscription(userId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Authenticated User: Submit Manual Payment Screenshot with Cycle ID
  static async submitManualPayment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated user' });
      }

      const { screenshotUrl, cycleId, amount, cycleName, transactionRef } = req.body;
      if (!screenshotUrl) {
        return res.status(400).json({ error: 'Payment screenshot URL is required' });
      }

      const result = await SubscriptionService.submitManualPayment(userId, {
        screenshotUrl,
        cycleId,
        amount: amount ? Number(amount) : undefined,
        cycleName,
        transactionRef,
      });

      res.status(201).json({
        message: 'Manual payment submitted successfully for Super Admin verification',
        transaction: result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Authenticated User: Process Gateway Payment (Razorpay / Stripe) linked to selected cycle
  static async subscribe(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      const { planName, paymentMethod, cycleId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated user' });
      }

      const result = await SubscriptionService.processPayment(userId, {
        planName,
        paymentMethod: paymentMethod || 'RAZORPAY',
        cycleId,
      });

      res.json({
        message: 'Subscription payment processed successfully!',
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Super Admin: Get Payment Management Dashboard (Metrics, Records & Cycles)
  static async getPaymentDashboard(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      const data = await SubscriptionService.getPaymentDashboardData({
        status: status as any,
        search: search as string,
      });

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Super Admin: Approve Payment Transaction or Due User with Selected Cycle Plan
  static async approvePayment(req: Request, res: Response) {
    try {
      const { transactionId, cycleId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID or User ID is required' });
      }

      const result = await SubscriptionService.approvePayment(transactionId, cycleId);
      res.json({
        message: 'Payment approved successfully! User subscription is now active.',
        transaction: result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Super Admin: Reject Payment Transaction
  static async rejectPayment(req: Request, res: Response) {
    try {
      const { transactionId, reason } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      const result = await SubscriptionService.rejectPayment(transactionId, reason);
      res.json({
        message: 'Payment rejected',
        transaction: result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
