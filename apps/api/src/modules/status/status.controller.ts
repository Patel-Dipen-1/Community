import { Request, Response } from 'express';
import { StatusService } from './status.service';

export class StatusController {
  // Get Category Config for Status Creation Form (Rules 3, 4, 5)
  static async getPosterConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const config = await StatusService.getPosterCategoryConfig(userId);
      res.json({ success: true, ...config });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Create / Post Status (Rules 1, 2, 3, 4, 5)
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const status = await StatusService.createStatus(userId, req.body);
      res.status(201).json({
        success: true,
        message: `WhatsApp status posted in categories: [${status.categories.join(', ')}]!`,
        status,
      });
    } catch (error: any) {
      const isUnapproved = error.message && error.message.includes('UNAPPROVED_USER');
      res.status(isUnapproved ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to post status',
      });
    }
  }

  // Get Category-Targeted Status Feed (Rules 2, 6, 7, 8 & Rule 10 Super Admin Overview)
  static async getFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const role = (req as any).user?.role;
      const email = (req as any).user?.email;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const result = await StatusService.getStatusFeed(userId, role, email);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Record View on Status (Rule 9)
  static async recordView(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const viewerUserId = (req as any).user?.userId || (req as any).user?.id;

      if (!viewerUserId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const result = await StatusService.recordStatusView(id, viewerUserId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Get Viewers List for Poster (Rule 9 & Rule 10)
  static async getViewers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requesterUserId = (req as any).user?.userId || (req as any).user?.id;
      const role = (req as any).user?.role;
      const email = (req as any).user?.email;

      if (!requesterUserId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const result = await StatusService.getStatusViewers(id, requesterUserId, role, email);
      res.json(result);
    } catch (error: any) {
      const isUnauth = error.message && error.message.includes('UNAUTHORIZED_STATUS_VIEWERS');
      res.status(isUnauth ? 403 : 400).json({ success: false, error: error.message });
    }
  }

  // Delete Status (Rule 10 & Poster Delete)
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requesterUserId = (req as any).user?.userId || (req as any).user?.id;
      const role = (req as any).user?.role;
      const email = (req as any).user?.email;

      if (!requesterUserId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const result = await StatusService.deleteStatus(id, requesterUserId, role, email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
