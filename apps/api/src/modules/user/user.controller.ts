import { Request, Response } from 'express';
import { RegisterUserSchema, LoginUserSchema, RequestAccountDeletionSchema } from './user.validation';
import { UserService } from './user.service';

export class UserController {
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const profile = await UserService.getProfile(userId);
      res.json({ user: profile });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to fetch user profile' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const result = await UserService.updateProfile(userId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update user profile' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const validated = RegisterUserSchema.parse(req.body);
      const user = await UserService.registerUser(validated);
      res.status(201).json({
        message: 'Business account registered successfully. Account is pending Super Admin verification.',
        userId: user.id,
        status: user.status,
      });
    } catch (error: any) {
      const message = Array.isArray(error.errors)
        ? error.errors.map((e: any) => `${e.path.join('.') ? e.path.join('.') + ': ' : ''}${e.message}`).join(', ')
        : error.message || 'Validation failed';
      res.status(400).json({ error: message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = LoginUserSchema.parse(req.body);
      const result = await UserService.loginUser(username, password, req.headers['user-agent'], req.ip);
      res.json({
        message: 'Login successful',
        token: result.token,
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          mobileNumber: result.user.mobileNumber,
          isVerified: result.user.isVerified,
          allowedCommunities: result.allowedCommunities,
          role: result.user.business?.assignedRole || (result.user.email === 'dnpatel2002@gmail.com' ? 'SUPER_ADMIN' : 'RETAILER'),
        },
      });
    } catch (error: any) {
      if (error.message === 'MAX_SESSIONS_EXCEEDED') {
        return res.status(403).json({
          error: 'Maximum active sessions reached (5/5). Please logout another device/session or terminate an existing active session.',
          canTerminateSession: true,
        });
      }
      const message = Array.isArray(error.errors)
        ? error.errors.map((e: any) => `${e.path.join('.') ? e.path.join('.') + ': ' : ''}${e.message}`).join(', ')
        : error.message || 'Login failed';
      res.status(400).json({ error: message });
    }
  }

  static async requestDeletion(req: Request, res: Response) {
    try {
      const { reason } = RequestAccountDeletionSchema.parse(req.body);
      const userId = (req as any).user.userId;
      const result = await UserService.requestAccountDeletion(userId, reason);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }
}
