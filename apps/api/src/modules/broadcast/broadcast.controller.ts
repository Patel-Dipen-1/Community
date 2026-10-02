import { Request, Response } from 'express';
import { BroadcastService } from './broadcast.service';

export class BroadcastController {
  // 1. Create Broadcast List
  static async createBroadcastList(req: Request, res: Response) {
    try {
      const creatorId = (req as any).user.userId || (req as any).user.id;
      const { title, description, recipientIds } = req.body;

      const result = await BroadcastService.createBroadcastList(creatorId, {
        title,
        description,
        recipientIds,
      });

      return res.status(201).json({ success: true, broadcastList: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to create broadcast list' });
    }
  }

  // 2. Get User Broadcast Lists
  static async getUserBroadcastLists(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const lists = await BroadcastService.getUserBroadcastLists(userId);
      return res.status(200).json({ success: true, broadcastLists: lists });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to fetch broadcast lists' });
    }
  }

  // 3. Get Single Broadcast List Details
  static async getBroadcastDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;

      const result = await BroadcastService.getBroadcastDetails(userId, listId);
      return res.status(200).json({ success: true, broadcastList: result });
    } catch (err: any) {
      const status = err.message?.startsWith('UNAUTHORIZED') ? 403 : 404;
      return res.status(status).json({ success: false, error: err.message || 'Broadcast list not found' });
    }
  }

  // 4. Update Broadcast List
  static async updateBroadcastList(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;
      const { title, description, recipientIds } = req.body;

      const result = await BroadcastService.updateBroadcastList(userId, listId, {
        title,
        description,
        recipientIds,
      });

      return res.status(200).json({ success: true, broadcastList: result });
    } catch (err: any) {
      const status = err.message?.startsWith('UNAUTHORIZED') ? 403 : 400;
      return res.status(status).json({ success: false, error: err.message || 'Failed to update broadcast list' });
    }
  }

  // 5. Add Recipients to Broadcast List
  static async addRecipients(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;
      const { recipientIds } = req.body;

      const result = await BroadcastService.addRecipients(userId, listId, recipientIds);
      return res.status(200).json({ success: true, broadcastList: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to add recipients' });
    }
  }

  // 6. Remove Recipients from Broadcast List
  static async removeRecipients(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;
      const { recipientIds } = req.body;

      const result = await BroadcastService.removeRecipients(userId, listId, recipientIds);
      return res.status(200).json({ success: true, broadcastList: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to remove recipients' });
    }
  }

  // 7. Duplicate Broadcast List
  static async duplicateBroadcastList(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;

      const result = await BroadcastService.duplicateBroadcastList(userId, listId);
      return res.status(201).json({ success: true, broadcastList: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to duplicate broadcast list' });
    }
  }

  // 8. Delete Broadcast List
  static async deleteBroadcastList(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;

      const result = await BroadcastService.deleteBroadcastList(userId, listId);
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      const status = err.message?.startsWith('UNAUTHORIZED') ? 403 : 400;
      return res.status(status).json({ success: false, error: err.message || 'Failed to delete broadcast list' });
    }
  }

  // 9. Send Broadcast Message
  static async sendBroadcastMessage(req: Request, res: Response) {
    try {
      const senderId = (req as any).user.userId || (req as any).user.id;
      const listId = req.params.id;
      const { text, productCode, mediaUrl, mediaType, attachments, clientMessageId } = req.body;

      const ioServer = (req.app as any).get('io');

      const result = await BroadcastService.sendBroadcastMessage(
        senderId,
        listId,
        { text, productCode, mediaUrl, mediaType, attachments, clientMessageId },
        ioServer
      );

      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to send broadcast message' });
    }
  }
}
