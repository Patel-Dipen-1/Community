import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { LikeService } from './like.service';

export class LikeController {
  static async toggleLike(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await LikeService.toggleLike(userId, req.body);
      res.json(result);
    } catch (error: any) {
      const status = error.message?.startsWith('COMMUNITY_RESTRICTED') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async getLikes(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const statusId = req.query.statusId as string | undefined;
      const productId = req.query.productId as string | undefined;

      const result = await LikeService.getLikes(userId, { statusId, productId });
      res.json(result);
    } catch (error: any) {
      const status = error.message?.startsWith('COMMUNITY_RESTRICTED') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }
}
