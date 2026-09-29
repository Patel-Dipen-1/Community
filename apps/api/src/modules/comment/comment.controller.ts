import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CommentService } from './comment.service';

export class CommentController {
  static async createComment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const comment = await CommentService.createComment(userId, req.body);
      res.status(201).json(comment);
    } catch (error: any) {
      const status = error.message?.startsWith('COMMUNITY_RESTRICTED') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async getComments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const statusId = req.query.statusId as string | undefined;
      const productId = req.query.productId as string | undefined;

      const comments = await CommentService.getComments(userId, { statusId, productId });
      res.json({ comments, data: comments });
    } catch (error: any) {
      const status = error.message?.startsWith('COMMUNITY_RESTRICTED') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async deleteComment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await CommentService.deleteComment(userId, id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
