import { prisma } from '@b2b/database';

export class StatusService {
  /**
   * Helper to retrieve status creation category configuration (Rules 3 & 4)
   */
  static async getPosterCategoryConfig(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    const isApproved = Boolean(user.isVerified || user.status === 'APPROVED');
    const allowedCommunities = user.business?.allowedCommunities || ['clothing'];

    return {
      userId: user.id,
      fullName: user.fullName,
      shopName: user.business?.shopName || 'Vendor',
      isApproved,
      allowedCommunities,
      canSelectMultipleCategories: allowedCommunities.length >= 2,
      defaultCategory: allowedCommunities[0] || 'clothing',
    };
  }

  /**
   * Create / Post WhatsApp Status
   * Rule 1: Only APPROVED users can post
   * Rules 2, 3, 4, 5: 1 category -> auto-selected; 2+ categories -> selector for 1 or multiple categories
   */
  static async createStatus(userId: string, data: any): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    // Rule 1: Approval Check
    const isApproved = Boolean(user.isVerified || user.status === 'APPROVED');
    if (!isApproved) {
      throw new Error('UNAPPROVED_USER: Only Super Admin approved vendor accounts can post WhatsApp status updates.');
    }

    if (!user.business?.id) {
      throw new Error('Business profile required to post trade status');
    }

    // Rules 3, 4, 5: Category assignment logic
    const posterComms: string[] = user.business.allowedCommunities || ['clothing'];
    let targetCategories: string[] = [];

    if (posterComms.length === 1) {
      // 1 category -> forced automatically
      targetCategories = [posterComms[0].toLowerCase()];
    } else if (posterComms.length >= 2) {
      // 2+ categories -> poster can select 1 or multiple categories from assigned
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        targetCategories = data.categories
          .map((c: string) => c.toLowerCase())
          .filter((c: string) => posterComms.includes(c));
      }

      if (targetCategories.length === 0) {
        targetCategories = [posterComms[0].toLowerCase()];
      }
    } else {
      targetCategories = ['clothing'];
    }

    // 24-hour expiration calculation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await prisma.status.create({
      data: {
        userId: user.id,
        businessId: user.business.id,
        caption: data.caption || null,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || (data.mediaUrl ? (data.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'VIDEO' : 'IMAGE') : 'TEXT'),
        bgColor: data.bgColor || '#0f172a',
        categories: targetCategories,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
        business: {
          select: {
            id: true,
            shopName: true,
            allowedCommunities: true,
          },
        },
        views: true,
      },
    });

    return status;
  }

  /**
   * Get Targeted Feed of Statuses
   * Rules 2, 6, 7, 8: Filtered strictly to viewer's assigned category communities
   * Rule 10: Super Admin sees ALL statuses across all categories & creators
   */
  static async getStatusFeed(viewerUserId: string, tokenRole?: string, tokenEmail?: string): Promise<any> {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerUserId },
      include: { business: true },
    });

    if (!viewer) {
      return { success: false, statuses: [] };
    }

    const isSuperAdmin =
      tokenRole === 'SUPER_ADMIN' ||
      tokenEmail === 'dnpatel2002@gmail.com' ||
      viewer.email === 'dnpatel2002@gmail.com' ||
      viewer.business?.assignedRole === 'SUPER_ADMIN';

    // 24h freshness filter
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Rule 10: Super Admin View
    if (isSuperAdmin) {
      const allStatuses = await prisma.status.findMany({
        where: {
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, fullName: true, mobileNumber: true },
          },
          business: {
            select: { id: true, shopName: true, allowedCommunities: true },
          },
          views: {
            include: {
              viewer: {
                select: { id: true, fullName: true, mobileNumber: true },
              },
            },
          },
        },
      });

      return {
        success: true,
        isSuperAdmin: true,
        totalStatuses: allStatuses.length,
        statuses: allStatuses,
      };
    }

    // Rules 6, 7, 8: Regular Approved Vendor View
    const isApproved = Boolean(viewer.isVerified || viewer.status === 'APPROVED');
    if (!isApproved) {
      return {
        success: true,
        isApproved: false,
        message: 'Only approved users can watch category WhatsApp statuses.',
        statuses: [],
      };
    }

    const viewerCategories = viewer.business?.allowedCommunities || ['clothing'];

    // Query statuses whose categories array has overlap with viewer's allowedCommunities
    const targetedStatuses = await prisma.status.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        OR: [
          // 1. Statuses posted by this user
          { userId: viewerUserId },
          // 2. Statuses targeting categories matching viewer's allowedCommunities
          {
            categories: { hasSome: viewerCategories },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, fullName: true, mobileNumber: true },
        },
        business: {
          select: { id: true, shopName: true, allowedCommunities: true },
        },
        views: {
          select: { viewerId: true, viewedAt: true },
        },
      },
    });

    return {
      success: true,
      isSuperAdmin: false,
      viewerCategories,
      totalStatuses: targetedStatuses.length,
      statuses: targetedStatuses,
    };
  }

  /**
   * Rule 9: Record Status View & Get Viewers list for Poster
   */
  static async recordStatusView(statusId: string, viewerUserId: string): Promise<any> {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new Error('Status story not found');
    }

    // Record view in database (upsert to avoid duplicates)
    try {
      await prisma.statusView.upsert({
        where: {
          statusId_viewerId: {
            statusId,
            viewerId: viewerUserId,
          },
        },
        create: {
          statusId,
          viewerId: viewerUserId,
        },
        update: {
          viewedAt: new Date(),
        },
      });
    } catch {
      // Ignore upsert race condition
    }

    const totalViews = await prisma.statusView.count({
      where: { statusId },
    });

    return { success: true, totalViews };
  }

  /**
   * Rule 9 & 10: Fetch Status Viewers list (Visible only to Poster & Super Admin)
   */
  static async getStatusViewers(statusId: string, requesterUserId: string, tokenRole?: string, tokenEmail?: string): Promise<any> {
    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { business: true },
    });

    const isSuperAdmin =
      tokenRole === 'SUPER_ADMIN' ||
      tokenEmail === 'dnpatel2002@gmail.com' ||
      requester?.email === 'dnpatel2002@gmail.com' ||
      requester?.business?.assignedRole === 'SUPER_ADMIN';

    const status = await prisma.status.findUnique({
      where: { id: statusId },
      include: {
        views: {
          include: {
            viewer: {
              select: {
                id: true,
                fullName: true,
                mobileNumber: true,
                business: {
                  select: { shopName: true, allowedCommunities: true },
                },
              },
            },
          },
          orderBy: { viewedAt: 'desc' },
        },
      },
    });

    if (!status) {
      throw new Error('Status not found');
    }

    // Check privacy: only poster or Super Admin can inspect who viewed
    if (!isSuperAdmin && status.userId !== requesterUserId) {
      throw new Error('UNAUTHORIZED_STATUS_VIEWERS: Only the status creator or Super Admin can see viewer analytics.');
    }

    const viewersList = status.views.map((v) => ({
      viewerId: v.viewer.id,
      fullName: v.viewer.fullName,
      mobileNumber: v.viewer.mobileNumber,
      shopName: v.viewer.business?.shopName || 'Vendor',
      allowedCommunities: v.viewer.business?.allowedCommunities || [],
      viewedAt: v.viewedAt,
    }));

    return {
      success: true,
      statusId: status.id,
      totalViews: viewersList.length,
      viewers: viewersList,
    };
  }

  /**
   * Delete Status (Poster or Super Admin)
   */
  static async deleteStatus(statusId: string, requesterUserId: string, tokenRole?: string, tokenEmail?: string): Promise<any> {
    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { business: true },
    });

    const isSuperAdmin =
      tokenRole === 'SUPER_ADMIN' ||
      tokenEmail === 'dnpatel2002@gmail.com' ||
      requester?.email === 'dnpatel2002@gmail.com' ||
      requester?.business?.assignedRole === 'SUPER_ADMIN';

    const existing = await prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!existing) {
      throw new Error('Status not found');
    }

    if (!isSuperAdmin && existing.userId !== requesterUserId) {
      throw new Error('UNAUTHORIZED: You can only delete your own status updates.');
    }

    await prisma.status.delete({
      where: { id: statusId },
    });

    return { success: true, message: 'Status deleted successfully' };
  }

  /**
   * Toggle Mute / Unmute a specific contact's statuses
   */
  static async toggleMuteStatus(userId: string, targetUserId: string): Promise<any> {
    const existing = await prisma.statusMute.findUnique({
      where: { userId_mutedUserId: { userId, mutedUserId: targetUserId } },
    });

    if (existing) {
      await prisma.statusMute.delete({ where: { id: existing.id } });
      return { isMuted: false, message: 'Contact statuses unmuted' };
    } else {
      await prisma.statusMute.create({
        data: { userId, mutedUserId: targetUserId },
      });
      return { isMuted: true, message: 'Contact statuses muted' };
    }
  }

  /**
   * Get list of muted contact user IDs
   */
  static async getMutedUserIds(userId: string): Promise<string[]> {
    const mutes = await prisma.statusMute.findMany({
      where: { userId },
      select: { mutedUserId: true },
    });
    return mutes.map((m) => m.mutedUserId);
  }
}
