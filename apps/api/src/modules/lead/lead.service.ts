import { prisma } from '@b2b/database';

export class LeadService {
  /**
   * Helper to retrieve user category configuration for lead creation
   * Rules 1, 2, 3, 4: Checks approval & whether user has 1 or 2+ assigned categories
   */
  static async getUserCategoryConfig(userId: string): Promise<any> {
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
      isApproved,
      allowedCommunities,
      canSelectCategory: allowedCommunities.length >= 2,
      defaultCategory: allowedCommunities[0] || 'clothing',
    };
  }

  /**
   * Create Lead Inquiry
   * Rule 1: Only approved users can create leads
   * Rules 2, 3, 4: Category selected automatically if 1 category; picker if 2+ categories
   * Rule 8: Distributed in initial batch of up to 10 eligible category users
   */
  static async captureLead(creatorUserId: string | undefined, data: any): Promise<any> {
    let creatorUser: any = null;
    let creatorBusinessId: string | null = data.businessId || null;

    if (creatorUserId) {
      creatorUser = await prisma.user.findUnique({
        where: { id: creatorUserId },
        include: { business: true },
      });
    }

    // Rule 1: Verify creator approval status
    if (creatorUser) {
      const isApproved = Boolean(creatorUser.isVerified || creatorUser.status === 'APPROVED');
      if (!isApproved) {
        throw new Error('UNAPPROVED_USER: Only Super Admin approved vendor accounts can create trade leads.');
      }
      if (creatorUser.business?.id) {
        creatorBusinessId = creatorUser.business.id;
      }
    }

    // Resolve Business ID fallback from product if needed
    if (!creatorBusinessId && (data.productCode || data.productId)) {
      const p = await prisma.product.findFirst({
        where: {
          OR: [
            ...(data.productCode ? [{ code: data.productCode }] : []),
            ...(data.productId ? [{ id: data.productId }] : []),
          ],
        },
      });
      if (p?.businessId) creatorBusinessId = p.businessId;
    }

    if (!creatorBusinessId) {
      const firstBiz = await prisma.business.findFirst();
      creatorBusinessId = firstBiz?.id || 'default-business-id';
    }

    // Rules 2, 3, 4: Resolve targetCategory from Creator's assigned communities
    const creatorAllowedComms: string[] = creatorUser?.business?.allowedCommunities || ['clothing'];
    let targetCategory = data.targetCategory;

    if (creatorAllowedComms.length === 1) {
      // Single category -> Forced automatically, no choice
      targetCategory = creatorAllowedComms[0];
    } else if (creatorAllowedComms.length >= 2) {
      // Multiple categories -> Check if selected category is within creator's allowed communities
      if (!targetCategory || !creatorAllowedComms.includes(targetCategory.toLowerCase())) {
        targetCategory = creatorAllowedComms[0];
      }
    } else {
      targetCategory = 'clothing';
    }

    targetCategory = targetCategory.toLowerCase();

    // Rules 5, 6, 7 & 8: Find first batch of up to 10 eligible approved users for this category
    const eligibleRecipients = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        id: { not: creatorUserId || '' },
        business: {
          allowedCommunities: { has: targetCategory },
        },
      },
      select: { id: true },
      take: 10,
    });

    const initialAssignedUserIds = eligibleRecipients.map((u) => u.id);

    const qty = data.quantity ? Number(data.quantity) : 1;
    const msg = data.message || `Initiated callback request for ${targetCategory.toUpperCase()} trade lead.`;

    const lead = await prisma.leadCapture.create({
      data: {
        businessId: creatorBusinessId,
        creatorUserId: creatorUserId || null,
        visitorName: data.visitorName,
        mobileNumber: data.mobileNumber,
        productCode: data.productCode || null,
        targetCategory,
        message: msg,
        quantity: qty,
        status: 'ACTIVE',
        batchSize: 10,
        currentBatch: 1,
        assignedUserIds: initialAssignedUserIds,
        clickedUserIds: [],
        totalClicks: 0,
      },
      include: {
        business: {
          select: {
            id: true,
            shopName: true,
            user: {
              select: {
                fullName: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    return lead;
  }

  /**
   * Click / Receive Lead Handler
   * Rule 9: Tracks user clicks. When 10 users click/receive, rotates to next eligible 10 users.
   */
  static async clickLead(leadId: string, recipientUserId: string): Promise<any> {
    const lead = await prisma.leadCapture.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Trade lead not found');
    }

    const clickedSet = new Set(lead.clickedUserIds);
    if (!clickedSet.has(recipientUserId)) {
      clickedSet.add(recipientUserId);
    }

    let newClickedUserIds = Array.from(clickedSet);
    let newAssignedUserIds = [...lead.assignedUserIds];
    let newBatchNumber = lead.currentBatch;
    let newStatus = lead.status;

    // Rule 9: Batch Rotation logic - After 10 clicks, rotate to next 10 eligible category users
    if (newClickedUserIds.length >= lead.batchSize) {
      // Find next batch of eligible approved users not already clicked or in current batch
      const nextEligibleUsers = await prisma.user.findMany({
        where: {
          status: 'APPROVED',
          id: {
            notIn: [
              ...(lead.creatorUserId ? [lead.creatorUserId] : []),
              ...newClickedUserIds,
              ...newAssignedUserIds,
            ],
          },
          business: {
            allowedCommunities: { has: lead.targetCategory },
          },
        },
        select: { id: true },
        take: lead.batchSize,
      });

      if (nextEligibleUsers.length > 0) {
        newBatchNumber += 1;
        newAssignedUserIds = nextEligibleUsers.map((u) => u.id);
        newClickedUserIds = []; // Reset clicked count for new batch
      } else {
        newStatus = 'COMPLETED'; // All eligible category users exhausted
      }
    }

    const updated = await prisma.leadCapture.update({
      where: { id: leadId },
      data: {
        clickedUserIds: newClickedUserIds,
        assignedUserIds: newAssignedUserIds,
        currentBatch: newBatchNumber,
        status: newStatus,
        totalClicks: { increment: 1 },
      },
    });

    return updated;
  }

  /**
   * Fetch Leads For User
   * Rule 10: Super Admin sees ALL leads, creators, categories, users, clicks, batches & rules.
   * Rules 5, 6, 7 & 8: Recipient vendor sees leads targeted to their category in their batch.
   */
  static async getLeadsForUser(userId: string, tokenRole?: string, tokenEmail?: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      return { success: false, leads: [] };
    }

    const isSuperAdmin =
      tokenRole === 'SUPER_ADMIN' ||
      tokenEmail === 'dnpatel2002@gmail.com' ||
      user.email === 'dnpatel2002@gmail.com' ||
      user.business?.assignedRole === 'SUPER_ADMIN';

    // Rule 10: Super Admin View
    if (isSuperAdmin) {
      const allLeads = await prisma.leadCapture.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              shopName: true,
              assignedRole: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  mobileNumber: true,
                },
              },
            },
          },
        },
      });

      // Enrich Super Admin lead objects with detailed recipient & click information
      const enrichedLeads = await Promise.all(
        allLeads.map(async (lead) => {
          const assignedUsers = await prisma.user.findMany({
            where: { id: { in: lead.assignedUserIds } },
            select: { id: true, fullName: true, mobileNumber: true },
          });

          const clickedUsers = await prisma.user.findMany({
            where: { id: { in: lead.clickedUserIds } },
            select: { id: true, fullName: true, mobileNumber: true },
          });

          return {
            ...lead,
            assignedUsers,
            clickedUsers,
          };
        })
      );

      return {
        success: true,
        isSuperAdmin: true,
        totalLeads: enrichedLeads.length,
        leads: enrichedLeads,
      };
    }

    // Rules 5, 6, 7 & 8: Regular Approved Vendor View
    const userComms = user.business?.allowedCommunities || ['clothing'];

    const userLeads = await prisma.leadCapture.findMany({
      where: {
        OR: [
          // 1. Leads created by this user
          { creatorUserId: userId },
          { businessId: user.business?.id },
          // 2. Leads targeted to this user in current batch matching user's allowed categories
          {
            assignedUserIds: { has: userId },
            targetCategory: { in: userComms },
            status: 'ACTIVE',
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            shopName: true,
          },
        },
      },
    });

    return {
      success: true,
      isSuperAdmin: false,
      userCategories: userComms,
      totalLeads: userLeads.length,
      leads: userLeads,
    };
  }

  /**
   * Super Admin Lead Rule Management (Rule 10)
   */
  static async adminManageLead(leadId: string, updatePayload: any): Promise<any> {
    const updated = await prisma.leadCapture.update({
      where: { id: leadId },
      data: {
        targetCategory: updatePayload.targetCategory ? updatePayload.targetCategory.toLowerCase() : undefined,
        status: updatePayload.status,
        batchSize: updatePayload.batchSize ? Number(updatePayload.batchSize) : undefined,
        currentBatch: updatePayload.currentBatch ? Number(updatePayload.currentBatch) : undefined,
        assignedUserIds: updatePayload.assignedUserIds,
        clickedUserIds: updatePayload.clickedUserIds,
      },
    });

    return updated;
  }
}
