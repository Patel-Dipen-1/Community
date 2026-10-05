import { Request, Response } from 'express';
import { ChatService } from './chat.service';

export class ChatController {
  static async searchUsers(req: Request, res: Response) {
    try {
      const currentUserId = (req as any).user.userId || (req as any).user.id;
      const query = (req.query.query || req.query.mobile || '') as string;
      const results = await ChatService.searchApprovedUsers(currentUserId, query);
      return res.status(200).json({ success: true, users: results });
    } catch (err: any) {
      const isRestricted = err.message?.startsWith('RESTRICTED_NOT_APPROVED');
      return res.status(isRestricted ? 403 : 400).json({
        success: false,
        error: err.message?.replace('RESTRICTED_NOT_APPROVED: ', '') || 'Failed to search users',
      });
    }
  }

  static async getOrCreateConversation(req: Request, res: Response) {
    try {
      const senderId = (req as any).user.userId || (req as any).user.id;
      const { recipientUserId, recipientMobileNumber } = req.body;
      const targetIdentifier = recipientUserId || recipientMobileNumber;

      if (!targetIdentifier) {
        return res.status(400).json({ success: false, error: 'recipientUserId or recipientMobileNumber is required' });
      }

      const result = await ChatService.getOrCreateConversation(senderId, targetIdentifier);
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      const isRestricted = err.message?.startsWith('RESTRICTED_NOT_APPROVED');
      return res.status(isRestricted ? 403 : 400).json({
        success: false,
        error: err.message?.replace('RESTRICTED_NOT_APPROVED: ', '') || 'Failed to initialize conversation',
      });
    }
  }

  static async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const conversations = await ChatService.getUserConversations(userId);
      return res.status(200).json({ success: true, conversations });
    } catch (err: any) {
      const isRestricted = err.message?.startsWith('RESTRICTED_NOT_APPROVED');
      return res.status(isRestricted ? 403 : 400).json({
        success: false,
        error: err.message?.replace('RESTRICTED_NOT_APPROVED: ', '') || 'Failed to fetch conversations',
      });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const conversationId = req.params.id;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const before = req.query.before as string | undefined;

      const result = await ChatService.getConversationMessages(userId, conversationId, { limit, before });
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      const isRestricted = err.message?.startsWith('RESTRICTED_NOT_APPROVED');
      return res.status(isRestricted ? 403 : 400).json({
        success: false,
        error: err.message?.replace('RESTRICTED_NOT_APPROVED: ', '') || 'Failed to fetch messages',
      });
    }
  }


  static async sendMessage(req: Request, res: Response) {
    try {
      const senderId = (req as any).user.userId || (req as any).user.id;
      let conversationId = req.params.id || req.body.conversationId;
      const { recipientId, recipientUserId, recipientMobileNumber, text, productCode, mediaUrl, clientMessageId } = req.body;

      if (!conversationId) {
        const targetIdentifier = recipientId || recipientUserId || recipientMobileNumber;
        if (!targetIdentifier) {
          return res.status(400).json({ success: false, error: 'conversationId or recipientId is required' });
        }
        const convRes = await ChatService.getOrCreateConversation(senderId, targetIdentifier);
        conversationId = convRes.conversationId;
      }

      const message = await ChatService.sendMessage(senderId, conversationId, { text, productCode, mediaUrl, clientMessageId });
      
      // Broadcast live via Socket.io if available on req.app
      const io = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('receive_message', message);
        io.emit('message:new', message);
      }

      return res.status(201).json({ success: true, conversationId, message });
    } catch (err: any) {
      const isRestricted = err.message?.startsWith('RESTRICTED_NOT_APPROVED');
      return res.status(isRestricted ? 403 : 400).json({
        success: false,
        error: err.message?.replace('RESTRICTED_NOT_APPROVED: ', '') || 'Failed to send message',
      });
    }
  }

  static async reactToMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const messageId = req.params.id;
      const { emoji } = req.body;

      if (!emoji) return res.status(400).json({ success: false, error: 'Emoji is required' });

      const updated = await ChatService.reactToMessage(userId, messageId, emoji);
      
      const io = req.app.get('io');
      if (io && updated.conversationId) {
        io.to(updated.conversationId).emit('message_reaction_updated', updated);
      }

      return res.json({ success: true, message: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async editMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const messageId = req.params.id;
      const { text } = req.body;

      if (!text?.trim()) return res.status(400).json({ success: false, error: 'Updated text is required' });

      const updated = await ChatService.editMessage(userId, messageId, text);

      const io = req.app.get('io');
      if (io && updated.conversationId) {
        io.to(updated.conversationId).emit('message_edited', updated);
      }

      return res.json({ success: true, message: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const messageId = req.params.id;

      const updated = await ChatService.deleteMessage(userId, messageId);

      const io = req.app.get('io');
      if (io && updated.conversationId) {
        io.to(updated.conversationId).emit('message_deleted', updated);
      }

      return res.json({ success: true, message: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async toggleBlockUser(req: Request, res: Response) {
    try {
      const blockerId = (req as any).user.userId || (req as any).user.id;
      const targetUserId = req.params.id;

      const result = await ChatService.toggleBlockUser(blockerId, targetUserId);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const conversationId = req.params.id;
      const { isPinned, isArchived, isMuted } = req.body;

      const result = await ChatService.updateConversationSetting(userId, conversationId, { isPinned, isArchived, isMuted });
      return res.json({ success: true, settings: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // Generate short-lived LiveKit RTC Access Token
  static async getLiveKitToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { roomName, participantName } = req.body;

      if (!roomName) {
        return res.status(400).json({ success: false, error: 'roomName (callId) is required' });
      }

      const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret1234567890supersecretkey64chars';
      const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://rtc.yourdomain.com';

      const { AccessToken } = await import('livekit-server-sdk');

      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: participantName || userId,
        ttl: '1h',
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      return res.status(200).json({
        success: true,
        token,
        wsUrl: livekitUrl,
        roomName,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to generate LiveKit token' });
    }
  }

  static async createPoll(req: Request, res: Response) {
    try {
      const creatorId = (req as any).user.userId || (req as any).user.id;
      const { question, options, conversationId, groupId, allowMultiple, expiresInHours } = req.body;

      const { PollService } = await import('./poll.service');
      const poll = await PollService.createPoll(creatorId, {
        question,
        options,
        conversationId,
        groupId,
        allowMultiple,
        expiresInHours,
      });

      const io = req.app.get('io');
      if (io) {
        if (conversationId) {
          io.to(conversationId).emit('poll:created', poll);
        } else if (groupId) {
          io.to(`group_${groupId}`).emit('poll:created', poll);
        }
      }

      return res.status(201).json({ success: true, poll });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async votePoll(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const pollId = req.params.id;
      const { optionId } = req.body;

      const { PollService } = await import('./poll.service');
      const updatedPoll = await PollService.votePoll(userId, pollId, optionId);

      const io = req.app.get('io');
      if (io && updatedPoll) {
        if (updatedPoll.conversationId) {
          io.to(updatedPoll.conversationId).emit('poll:voted', updatedPoll);
        } else if (updatedPoll.groupId) {
          io.to(`group_${updatedPoll.groupId}`).emit('poll:voted', updatedPoll);
        }
      }

      return res.status(200).json({ success: true, poll: updatedPoll });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getPoll(req: Request, res: Response) {
    try {
      const pollId = req.params.id;
      const { PollService } = await import('./poll.service');
      const poll = await PollService.getPollDetails(pollId);

      if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });
      return res.status(200).json({ success: true, poll });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async toggleStarMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const messageId = req.params.id;

      const { PollService } = await import('./poll.service');
      const result = await PollService.toggleStarMessage(userId, messageId);
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getStarredMessages(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { PollService } = await import('./poll.service');
      const messages = await PollService.getStarredMessages(userId);
      return res.status(200).json({ success: true, messages });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}


