import { Request, Response } from 'express';
import { ApproveVerificationSchema, TerminateSessionSchema, AssignCommunitiesSchema, UpdateGroupCapacitySchema } from './admin.validation';
import { AdminService } from './admin.service';
import { GroupService } from '../group/group.service';
import { parsePaginationParams } from '../../utils/pagination';

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getAllUsers(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const result = await AdminService.createUser(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.updateUser(userId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getQueue(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getVerificationQueue(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const { userId, assignedCategory, assignedRole } = req.body;
      const result = await AdminService.approveVerification(
        userId,
        assignedCategory || 'general',
        assignedRole || 'WHOLESALER'
      );
      res.json({
        message: `Account approved successfully. "Verified Business" tag granted for ${assignedCategory || 'general'} as ${assignedRole || 'WHOLESALER'}.`,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const result = await AdminService.rejectVerification(userId);
      res.json({ message: 'Registration rejected', ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getActiveSessions(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = TerminateSessionSchema.parse(req.body);
      const result = await AdminService.terminateSession(sessionId);
      res.json({
        message: `Session ${sessionId} terminated successfully. Device logged out immediately.`,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async getDeletionRequests(req: Request, res: Response) {
    try {
      const params = parsePaginationParams(req, 100);
      const result = await AdminService.getDeletionRequests(params);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.deleteAccount(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async editBusiness(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.adminEditBusiness(id, req.body);
      res.json({ message: 'Business updated by Super Admin', business: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async assignCommunities(req: Request, res: Response) {
    try {
      const { businessId, allowedCommunities } = AssignCommunitiesSchema.parse(req.body);
      const result = await AdminService.assignCommunities(businessId, allowedCommunities);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  static async updateGroupCapacity(req: Request, res: Response) {
    try {
      const { groupId, maxCapacity } = req.body;
      if (groupId) {
        const result = await AdminService.updateGroupCapacity(groupId, Number(maxCapacity));
        res.json(result);
      } else if (maxCapacity !== undefined) {
        const newCapacity = GroupService.setGlobalGroupCapacity(Number(maxCapacity));
        res.json({
          message: `Super Admin set default global group capacity limit to ${newCapacity} members.`,
          maxCapacity: newCapacity,
        });
      } else {
        res.status(400).json({ error: 'maxCapacity is required' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  // ---------------- DYNAMIC COMMUNITY & CATEGORY CRUD CONTROLLERS ----------------

  static async getCommunities(req: Request, res: Response) {
    try {
      const communities = await AdminService.getCommunities();
      res.json({ communities, data: communities });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createCommunity(req: Request, res: Response) {
    try {
      const result = await AdminService.createCommunity(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCommunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.updateCommunity(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCommunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteCommunity(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async allocateCommunitiesToUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { allowedCommunities } = req.body;
      const result = await AdminService.allocateCommunitiesToUser(userId, allowedCommunities);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

