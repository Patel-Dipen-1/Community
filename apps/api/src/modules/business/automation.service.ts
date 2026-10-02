import { prisma } from '@b2b/database';

export class BusinessAutomationService {
  // 1. Business Hours
  static async setBusinessHours(businessId: string, schedule: any, isClosed?: boolean) {
    const hours = await prisma.businessHours.upsert({
      where: { businessId },
      update: {
        schedule,
        ...(isClosed !== undefined && { isClosed }),
      },
      create: {
        businessId,
        schedule,
        isClosed: isClosed ?? false,
      },
    });

    return hours;
  }

  static async getBusinessHours(businessId: string) {
    return prisma.businessHours.findUnique({
      where: { businessId },
    });
  }

  // 2. Quick Replies
  static async createQuickReply(businessId: string, shortcut: string, replyText: string) {
    if (!shortcut || !replyText) {
      throw new Error('SHORTCUT_INVALID: Both shortcut (e.g. /catalog) and replyText are required');
    }

    const cleanShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
    const quickReply = await prisma.quickReply.create({
      data: {
        businessId,
        shortcut: cleanShortcut,
        replyText: replyText.trim(),
      },
    });

    return quickReply;
  }

  static async getQuickReplies(businessId: string) {
    return prisma.quickReply.findMany({
      where: { businessId },
      orderBy: { shortcut: 'asc' },
    });
  }

  static async deleteQuickReply(businessId: string, replyId: string) {
    const existing = await prisma.quickReply.findFirst({
      where: { id: replyId, businessId },
    });

    if (!existing) throw new Error('Quick reply not found');

    await prisma.quickReply.delete({ where: { id: replyId } });
    return { success: true, message: 'Quick reply shortcut deleted' };
  }
}
