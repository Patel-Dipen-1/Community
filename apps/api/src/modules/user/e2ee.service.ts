import { prisma } from '@b2b/database';

export class E2EEService {
  static async registerUserKeys(
    userId: string,
    data: { identityKey: string; signedPreKey: string; oneTimeKeys: string[] }
  ) {
    if (!data.identityKey || !data.signedPreKey || !Array.isArray(data.oneTimeKeys)) {
      throw new Error('E2EE_INVALID: identityKey, signedPreKey, and oneTimeKeys array are required');
    }

    const keyRecord = await prisma.e2EEKey.upsert({
      where: { userId },
      update: {
        identityKey: data.identityKey,
        signedPreKey: data.signedPreKey,
        oneTimeKeys: data.oneTimeKeys,
      },
      create: {
        userId,
        identityKey: data.identityKey,
        signedPreKey: data.signedPreKey,
        oneTimeKeys: data.oneTimeKeys,
      },
    });

    return keyRecord;
  }

  static async getUserPublicKeys(userId: string) {
    const keyRecord = await prisma.e2EEKey.findUnique({
      where: { userId },
    });

    if (!keyRecord) {
      throw new Error('E2EE_KEYS_NOT_FOUND: User has not registered E2EE encryption keys');
    }

    // Return identity key and prekeys for key exchange
    return {
      userId: keyRecord.userId,
      identityKey: keyRecord.identityKey,
      signedPreKey: keyRecord.signedPreKey,
      oneTimeKeysCount: Array.isArray(keyRecord.oneTimeKeys) ? (keyRecord.oneTimeKeys as any[]).length : 0,
    };
  }
}
