import { Request, Response } from 'express';
import { StoreService } from './store.service';
import { clearCacheByPattern } from '../../middleware/cache.middleware';

export class StoreController {
  // GET /api/v1/store/me - Fetch authenticated owner store details & stats
  static async getOwnerStore(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const data = await StoreService.getOwnerStore(userId);
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // PUT /api/v1/store/me - Update owner store details (Logo, Banner, Bio, Name, Status)
  static async updateOwnerStore(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const store = await StoreService.updateStore(userId, req.body);
      clearCacheByPattern('/store');
      res.json({ success: true, message: 'Store profile updated successfully!', store });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // GET /api/v1/store/:idOrSlug - Get Public/Authorized Store catalog
  static async getPublicStore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requesterUserId = (req as any).user.userId || (req as any).user.id;
      const data = await StoreService.getPublicStore(id, requesterUserId);
      res.json({ success: true, ...data });
    } catch (error: any) {
      const isRestricted = error.message && error.message.includes('COMMUNITY_RESTRICTED');
      const isInactive = error.message && error.message.includes('STORE_INACTIVE');
      const isNotApproved = error.message && error.message.includes('RESTRICTED_NOT_APPROVED');

      res.status(isRestricted || isInactive || isNotApproved ? 403 : 404).json({
        success: false,
        error: error.message,
      });
    }
  }
}
