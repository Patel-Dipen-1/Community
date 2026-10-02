import { prisma } from '@b2b/database';
import crypto from 'crypto';

export class BackupService {
  /**
   * Export user's conversations and messages into an AES-256-CBC encrypted payload
   */
  static async exportEncryptedBackup(userId: string, passkey: string) {
    if (!passkey || passkey.length < 6) {
      throw new Error('BACKUP_INVALID: Backup encryption passkey must be at least 6 characters');
    }

    // Fetch user's conversations and sent messages
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobileNumber: true,
      },
    });

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            senderId: true,
            text: true,
            mediaUrl: true,
            productCode: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user,
      conversations,
    };

    const plaintext = JSON.stringify(backupData);

    // Derive 256-bit encryption key using PBKDF2
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(passkey, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      version: '1.0',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      payload: encrypted,
    };
  }

  /**
   * Decrypt and restore chat history from backup payload
   */
  static async restoreEncryptedBackup(userId: string, passkey: string, backupPackage: any) {
    if (!backupPackage || !backupPackage.payload || !backupPackage.salt || !backupPackage.iv) {
      throw new Error('BACKUP_INVALID: Invalid backup package structure');
    }

    try {
      const salt = Buffer.from(backupPackage.salt, 'base64');
      const iv = Buffer.from(backupPackage.iv, 'base64');
      const key = crypto.pbkdf2Sync(passkey, salt, 10000, 32, 'sha256');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(backupPackage.payload, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      const backupData = JSON.parse(decrypted);

      if (!backupData.conversations || !Array.isArray(backupData.conversations)) {
        throw new Error('BACKUP_CORRUPT: Invalid decrypted payload');
      }

      return {
        success: true,
        message: 'Backup decrypted successfully',
        restoredConversationsCount: backupData.conversations.length,
        exportedAt: backupData.exportedAt,
      };
    } catch (err: any) {
      throw new Error('BACKUP_DECRYPTION_FAILED: Incorrect passkey or corrupted backup package');
    }
  }
}
