import { Request, Response } from 'express';
import { BusinessService } from './business.service';

export class BusinessController {
  static async getProfile(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const profile = await BusinessService.getProfile(businessId);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const updated = await BusinessService.updateProfile(businessId, req.body);
      res.json({ message: 'Business profile updated successfully', profile: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createWebhook(req: Request, res: Response) {
    try {
      const { targetUrl, events } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { WebhookService } = await import('./webhook.service');
      const webhook = await WebhookService.registerWebhook(user.business.id, targetUrl, events);
      res.status(201).json({ success: true, webhook });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getWebhooks(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { WebhookService } = await import('./webhook.service');
      const webhooks = await WebhookService.getBusinessWebhooks(user.business.id);
      res.json({ success: true, webhooks });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteWebhook(req: Request, res: Response) {
    try {
      const webhookId = req.params.id;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { WebhookService } = await import('./webhook.service');
      const result = await WebhookService.deleteWebhook(user.business.id, webhookId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateHours(req: Request, res: Response) {
    try {
      const { schedule, isClosed } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { BusinessAutomationService } = await import('./automation.service');
      const hours = await BusinessAutomationService.setBusinessHours(user.business.id, schedule, isClosed);
      res.json({ success: true, hours });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getHours(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { BusinessAutomationService } = await import('./automation.service');
      const hours = await BusinessAutomationService.getBusinessHours(businessId);
      res.json({ success: true, hours });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createQuickReply(req: Request, res: Response) {
    try {
      const { shortcut, replyText } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { BusinessAutomationService } = await import('./automation.service');
      const quickReply = await BusinessAutomationService.createQuickReply(user.business.id, shortcut, replyText);
      res.status(201).json({ success: true, quickReply });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getQuickReplies(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { BusinessAutomationService } = await import('./automation.service');
      const quickReplies = await BusinessAutomationService.getQuickReplies(user.business.id);
      res.json({ success: true, quickReplies });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteQuickReply(req: Request, res: Response) {
    try {
      const replyId = req.params.id;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { prisma } = await import('@b2b/database');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { business: { select: { id: true } } },
      });

      if (!user?.business?.id) {
        return res.status(400).json({ error: 'Business account required' });
      }

      const { BusinessAutomationService } = await import('./automation.service');
      const result = await BusinessAutomationService.deleteQuickReply(user.business.id, replyId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
