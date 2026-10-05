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
        sessionWarning: result.sessionWarning || null,
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          mobileNumber: result.user.mobileNumber,
          status: result.user.status,
          isVerified: result.user.isVerified,
          allowedCommunities: result.allowedCommunities,
          role: result.user.business?.assignedRole || (result.user.email === 'dnpatel2002@gmail.com' ? 'SUPER_ADMIN' : 'RETAILER'),
        },
      });
    } catch (error: any) {
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

  static async getPrivacy(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { PrivacyService } = await import('./privacy.service');
      const privacy = await PrivacyService.getUserPrivacy(userId);
      res.json({ success: true, privacy });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updatePrivacy(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { PrivacyService } = await import('./privacy.service');
      const privacy = await PrivacyService.updateUserPrivacy(userId, req.body);
      res.json({ success: true, privacy });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCallHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { PrivacyService } = await import('./privacy.service');
      const calls = await PrivacyService.getCallHistory(userId);
      res.json({ success: true, calls });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async logCall(req: Request, res: Response) {
    try {
      const callerId = (req as any).user.userId || (req as any).user.id;
      const { receiverId, callType, status, durationSecs, livekitRoom } = req.body;
      const { PrivacyService } = await import('./privacy.service');
      const log = await PrivacyService.logCall({ callerId, receiverId, callType, status, durationSecs, livekitRoom });
      res.status(201).json({ success: true, log });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async registerE2EEKeys(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { identityKey, signedPreKey, oneTimeKeys } = req.body;
      const { E2EEService } = await import('./e2ee.service');
      const keys = await E2EEService.registerUserKeys(userId, { identityKey, signedPreKey, oneTimeKeys });
      res.status(201).json({ success: true, keys });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getE2EEKeys(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { E2EEService } = await import('./e2ee.service');
      const keys = await E2EEService.getUserPublicKeys(userId);
      res.json({ success: true, keys });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async exportBackup(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { passkey } = req.body;
      const { BackupService } = await import('./backup.service');
      const backupPackage = await BackupService.exportEncryptedBackup(userId, passkey);
      res.json({ success: true, backupPackage });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async restoreBackup(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { passkey, backupPackage } = req.body;
      const { BackupService } = await import('./backup.service');
      const result = await BackupService.restoreEncryptedBackup(userId, passkey, backupPackage);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async setup2FA(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { TwoFactorService } = await import('./twoFactor.service');
      const result = await TwoFactorService.setup2FA(userId);
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verify2FA(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { code } = req.body;
      const { TwoFactorService } = await import('./twoFactor.service');
      const result = await TwoFactorService.verifyAndEnable2FA(userId, code);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async get2FAStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { prisma } = await import('@b2b/database');
      const { TwoFactorService } = await import('./twoFactor.service');

      const isGloballyActive = await TwoFactorService.isGloballyEnabled();
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { isTwoFactorEnabled: true } });

      res.json({
        success: true,
        isGloballyEnabled: isGloballyActive,
        isUserTwoFactorEnabled: user?.isTwoFactorEnabled ?? false,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async registerPushToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId || (req as any).user.id;
      const { token, platform } = req.body;
      const { PushNotificationService } = await import('./push.service');
      const pushToken = await PushNotificationService.registerPushToken(userId, token, platform);
      res.status(201).json({ success: true, pushToken });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPushConfig(req: Request, res: Response) {
    try {
      const { PushNotificationService } = await import('./push.service');
      const config = await PushNotificationService.isGloballyEnabled();
      res.json({ success: true, config });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

