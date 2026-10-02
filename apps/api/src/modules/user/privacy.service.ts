import { prisma } from '@b2b/database';

export class PrivacyService {
  static async getUserPrivacy(userId: string) {
    let privacy = await prisma.userPrivacy.findUnique({
      where: { userId },
    });

    if (!privacy) {
      privacy = await prisma.userPrivacy.create({
        data: { userId },
      });
    }

    return privacy;
  }

  static async updateUserPrivacy(
    userId: string,
    data: {
      lastSeen?: string;
      onlineStatus?: string;
      profilePhoto?: string;
      aboutStatus?: string;
      groupAdd?: string;
      callPrivacy?: string;
    }
  ) {
    const updated = await prisma.userPrivacy.upsert({
      where: { userId },
      update: {
        ...(data.lastSeen && { lastSeen: data.lastSeen }),
        ...(data.onlineStatus && { onlineStatus: data.onlineStatus }),
        ...(data.profilePhoto && { profilePhoto: data.profilePhoto }),
        ...(data.aboutStatus && { aboutStatus: data.aboutStatus }),
        ...(data.groupAdd && { groupAdd: data.groupAdd }),
        ...(data.callPrivacy && { callPrivacy: data.callPrivacy }),
      },
      create: {
        userId,
        ...data,
      },
    });

    return updated;
  }

  static async logCall(data: {
    callerId: string;
    receiverId: string;
    callType: 'AUDIO' | 'VIDEO';
    status: 'CONNECTED' | 'MISSED' | 'REJECTED' | 'BUSY';
    durationSecs?: number;
    livekitRoom?: string;
  }) {
    const log = await prisma.callLog.create({
      data: {
        callerId: data.callerId,
        receiverId: data.receiverId,
        callType: data.callType,
        status: data.status,
        durationSecs: data.durationSecs || 0,
        livekitRoom: data.livekitRoom,
      },
    });
    return log;
  }

  static async getCallHistory(userId: string) {
    const calls = await prisma.callLog.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
      include: {
        caller: { select: { id: true, fullName: true, mobileNumber: true, avatar: true } },
        receiver: { select: { id: true, fullName: true, mobileNumber: true, avatar: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return calls;
  }
}
