import { Request, Response } from 'express';
import { CreateGroupSchema, AddGroupMemberSchema, SendGroupMessageSchema } from './group.validation';
import { GroupService } from './group.service';

export class GroupController {
  // GET /api/v1/groups - List all active groups
  static async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const groups = await GroupService.getAllGroups(userId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/v1/groups - Create a new group (Only Super Admin approved users)
  static async create(req: Request, res: Response) {
    try {
      const validated = CreateGroupSchema.parse(req.body);
      const user = (req as any).user;
      const group = await GroupService.createGroup(user.userId, validated);
      res.status(201).json({ message: 'Group created successfully', group });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  // POST /api/v1/groups/:id/join - Join a group (Capacity Enforced e.g. Max 40)
  static async join(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const result = await GroupService.joinGroup(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // GET /api/v1/groups/:id/suggested-members - Get community-based member add suggestions for Group Admin
  static async getSuggestedMembers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { search, category } = req.query;
      const requesterId = (req as any).user.userId;

      const result = await GroupService.getSuggestedMembers(
        id,
        requesterId,
        search as string | undefined,
        category as string | undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/v1/groups/:id/members/bulk - Bulk add selected members (Group Admin only)
  static async bulkAddMembers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;
      const requesterId = (req as any).user.userId;

      const result = await GroupService.bulkAddMembers(id, userIds, requesterId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/v1/groups/:id/members - Add member by Admin
  static async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = AddGroupMemberSchema.parse(req.body);
      const requesterId = (req as any).user.userId;

      const result = await GroupService.addMember(
        id,
        userId,
        requesterId
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  // DELETE /api/v1/groups/:id/members/:userId - Remove member or leave
  static async removeMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const requesterId = (req as any).user.userId;
      const result = await GroupService.removeMember(id, userId, requesterId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // PUT /api/v1/groups/:id/members/:userId/promote - Promote member to Group Admin
  static async promoteMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const requesterId = (req as any).user.userId;
      const result = await GroupService.promoteMember(id, userId, requesterId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // PUT /api/v1/groups/:id/members/:userId/demote - Demote Group Admin to Member
  static async demoteMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const requesterId = (req as any).user.userId;
      const result = await GroupService.demoteMember(id, userId, requesterId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/v1/groups/:id/messages - Send group message
  static async sendMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = SendGroupMessageSchema.parse(req.body);
      const user = (req as any).user;
      const message = await GroupService.sendMessage(id, user.userId, validated);

      // Broadcast live via Socket.io to group room
      const io = req.app.get('io');
      if (io) {
        io.to(`group_${id}`).emit('receive_group_message', message);
      }

      res.status(201).json({ message: 'Message sent', data: message });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  // PUT /api/v1/groups/messages/:id - Edit group message
  static async editMessage(req: Request, res: Response) {
    try {
      const messageId = req.params.id;
      const { text } = req.body;
      const userId = (req as any).user.userId;

      if (!text?.trim()) {
        return res.status(400).json({ error: 'Updated text is required' });
      }

      const updated = await GroupService.editGroupMessage(userId, messageId, text);

      const io = req.app.get('io');
      if (io && updated.groupId) {
        io.to(`group_${updated.groupId}`).emit('group_message_edited', updated);
      }

      res.json({ message: 'Message updated successfully', data: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  // GET /api/v1/groups/:id - Get group details & messages with sender privacy masking
  static async getDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const before = req.query.before as string | undefined;

      const details = await GroupService.getGroupDetails(id, userId, { limit, before });
      res.json(details);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  // POST /api/v1/groups/:id/leave - Leave group
  static async leave(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const result = await GroupService.leaveGroup(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // PUT /api/v1/groups/:id/settings - Update group privacy settings (Group Admin only)
  static async updateSettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const result = await GroupService.updateGroupSettings(id, userId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // DELETE /api/v1/groups/:id - Delete group (Group Admin only)
  static async deleteGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const result = await GroupService.deleteGroup(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // GET /api/v1/groups/global-capacity - Get default global max capacity limit
  static async getGlobalCapacity(_req: Request, res: Response) {
    try {
      const maxCapacity = GroupService.getGlobalGroupCapacity();
      res.json({ maxCapacity });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/v1/groups/global-capacity - Update default global max capacity limit
  static async updateGlobalCapacity(req: Request, res: Response) {
    try {
      const { maxCapacity } = req.body;
      if (!maxCapacity || isNaN(Number(maxCapacity))) {
        return res.status(400).json({ error: 'Valid maxCapacity number is required' });
      }
      const newCapacity = GroupService.setGlobalGroupCapacity(Number(maxCapacity));
      res.json({
        message: `Super Admin set default global group capacity limit to ${newCapacity} members.`,
        maxCapacity: newCapacity,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // PUT /api/v1/groups/:id/capacity - Update capacity (Super Admin override)
  static async updateCapacity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { maxCapacity } = req.body;
      if (!maxCapacity || isNaN(Number(maxCapacity))) {
        return res.status(400).json({ error: 'Valid maxCapacity number is required' });
      }
      const result = await GroupService.updateGroupCapacity(id, Number(maxCapacity));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getInviteLink(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const result = await GroupService.getOrCreateInviteToken(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async joinViaInviteToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      const userId = (req as any).user.userId || (req as any).user.id;
      if (!token) return res.status(400).json({ error: 'Invite token is required' });
      const result = await GroupService.joinViaInviteToken(userId, token);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createJoinRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const result = await GroupService.createJoinRequest(id, userId);

      const io = req.app.get('io');
      if (io) {
        io.to(`group_${id}`).emit('group:join_request', result.request);
      }

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getJoinRequests(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const requests = await GroupService.getPendingJoinRequests(id, userId);
      res.json({ success: true, requests });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async approveJoinRequest(req: Request, res: Response) {
    try {
      const { id, requestId } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const result = await GroupService.approveJoinRequest(id, requestId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async rejectJoinRequest(req: Request, res: Response) {
    try {
      const { id, requestId } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const result = await GroupService.rejectJoinRequest(id, requestId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

