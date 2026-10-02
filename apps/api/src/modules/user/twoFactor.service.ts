import { prisma } from '@b2b/database';
import crypto from 'crypto';

export class TwoFactorService {
  /**
   * Check if 2FA is globally enabled by Super Admin
   */
  static async isGloballyEnabled(): Promise<boolean> {
    const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    return setting?.twoFactorAuthEnabled ?? false;
  }

  /**
   * Super Admin toggle 2FA system status
   */
  static async toggleGlobal2FA(enabled: boolean) {
    const setting = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: { twoFactorAuthEnabled: enabled },
      create: { id: 'default', twoFactorAuthEnabled: enabled },
    });

    return {
      twoFactorAuthEnabled: setting.twoFactorAuthEnabled,
      message: `Two-Factor Authentication (2FA) is now ${enabled ? 'ENABLED' : 'DISABLED'} globally by Super Admin.`,
    };
  }

  /**
   * Generate 2FA Secret Key & TOTP Setup URI
   */
  static async setup2FA(userId: string) {
    const isGlobalActive = await TwoFactorService.isGloballyEnabled();
    if (!isGlobalActive) {
      throw new Error('2FA_DISABLED_BY_ADMIN: Two-Factor Authentication is currently disabled by Super Admin.');
    }

    const secret = crypto.randomBytes(20).toString('hex').toUpperCase();
    const formattedSecret = secret.substring(0, 16);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: formattedSecret },
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
    const otpAuthUrl = `otpauth://totp/B2BStore:${encodeURIComponent(user?.email || userId)}?secret=${formattedSecret}&issuer=B2BStore`;

    return {
      secret: formattedSecret,
      otpAuthUrl,
      message: '2FA secret generated. Scan QR code or enter secret key into Google Authenticator / Authy app.',
    };
  }

  /**
   * Verify TOTP Code (RFC 6238 HMAC-SHA1 TOTP Implementation)
   */
  static verifyTOTPCode(secret: string, code: string): boolean {
    if (!secret || !code || code.length !== 6 || isNaN(Number(code))) return false;

    // Check time windows (current window, -1, +1 for clock skew tolerance)
    const timeStep = 30; // 30 seconds
    const now = Math.floor(Date.now() / 1000);

    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor((now + i * timeStep) / timeStep);
      const generatedCode = TwoFactorService.generateCodeForCounter(secret, counter);
      if (generatedCode === code.trim()) {
        return true;
      }
    }

    return false;
  }

  private static generateCodeForCounter(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    let tempCounter = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = tempCounter & 0xff;
      tempCounter = Math.floor(tempCounter / 256);
    }

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8'));
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0xf;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Verify & Enable 2FA on User Account
   */
  static async verifyAndEnable2FA(userId: string, code: string) {
    const isGlobalActive = await TwoFactorService.isGloballyEnabled();
    if (!isGlobalActive) {
      throw new Error('2FA_DISABLED_BY_ADMIN: Two-Factor Authentication is currently disabled by Super Admin.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, isTwoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA_NOT_SETUP: Please initialize 2FA setup first to generate secret key');
    }

    const isValid = TwoFactorService.verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) {
      throw new Error('OTP_INVALID: Invalid 6-digit 2FA verification code. Please try again.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });

    return {
      success: true,
      message: 'Two-Factor Authentication enabled successfully for your account.',
    };
  }

  /**
   * Verify Login 2FA Code
   */
  static async verifyLogin2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, isTwoFactorEnabled: true },
    });

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return true; // If 2FA not enabled for user, skip
    }

    const isValid = TwoFactorService.verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) {
      throw new Error('OTP_INVALID: Invalid 6-digit 2FA verification code.');
    }

    return true;
  }
}
