import { prisma } from '@b2b/database';
import { getUserCategoryProfile } from '../../utils/categoryAccess';

// Super Admin Global Default Group Capacity Setting (Default: 40 members)
let superAdminGlobalMaxCapacity = 40;

export class GroupService {
  static setGlobalGroupCapacity(capacity: number) {
    superAdminGlobalMaxCapacity = capacity;
    return superAdminGlobalMaxCapacity;
  }

  static getGlobalGroupCapacity() {
    return superAdminGlobalMaxCapacity;
  }

  // 1. Group Creation (Account status APPROVED -> Immediate creation)
  static async createGroup(createdById: string, data: any) {
    const userProfile = await getUserCategoryProfile(createdById);
    if (!userProfile || (!userProfile.isApproved && !userProfile.isSuperAdmin)) {
      throw new Error(
        `UNAPPROVED_USER: Only Super Admin approved vendors can create groups. Your current status is '${userProfile?.status || 'UNVERIFIED'}'.`
      );
    }

    const targetCategory = (data.communitySlug || userProfile.allowedCommunities[0] || 'clothing').toLowerCase();
    const hasCategory = userProfile.isSuperAdmin || userProfile.allowedCommunities.map(c => c.toLowerCase()).includes(targetCategory);
    if (!hasCategory) {
      throw new Error(`COMMUNITY_RESTRICTED: You cannot create a group in category '${targetCategory}' as it is not assigned to your account.`);
    }

    const requestedCapacity = Number(data.maxCapacity) || superAdminGlobalMaxCapacity;
    const effectiveCapacity = Math.min(Math.max(requestedCapacity, 2), 500);

    const rawMemberIds: string[] = Array.isArray(data.memberUserIds)
      ? data.memberUserIds
      : Array.isArray(data.selectedUserIds)
      ? data.selectedUserIds
      : Array.isArray(data.recipientIds)
      ? data.recipientIds
      : [];

    const uniqueMemberIds = Array.from(
      new Set(rawMemberIds.filter((id) => typeof id === 'string' && id && id !== createdById))
    );

    const membersToCreate = [
      { userId: createdById, roleInGroup: 'ADMIN' as const },
      ...uniqueMemberIds.map((uId) => ({ userId: uId, roleInGroup: 'MEMBER' as const })),
    ];

    // Create Group in PostgreSQL
    const group = await prisma.group.create({
      data: {
        title: data.title,
        description: data.description || '',
        type: data.type || 'GROUP',
        communitySlug: targetCategory,
        createdById,
        maxCapacity: effectiveCapacity,
        onlyAdminCanPost: Boolean(data.onlyAdminCanPost),
        hideMemberIdentity: data.hideMemberIdentity !== undefined ? Boolean(data.hideMemberIdentity) : true,
        membersCanSeeMemberList: data.membersCanSeeMemberList !== undefined ? Boolean(data.membersCanSeeMemberList) : false,
        members: {
          create: membersToCreate,
        },
      },
      include: {
        members: true,
      },
    });

    return group;
  }

  // List all available active groups from PostgreSQL matching user's allowed communities
  static async getAllGroups(userId?: string) {
    let allowedCommunities: string[] = ['clothing'];
    let isSuperAdmin = false;

    if (userId) {
      const profile = await getUserCategoryProfile(userId);
      if (profile) {
        allowedCommunities = profile.allowedCommunities;
        isSuperAdmin = profile.isSuperAdmin;
      }
    }

    const whereCondition: any = {
      isDeleted: false,
    };

    if (!isSuperAdmin && userId) {
      whereCondition.OR = [
        { createdById: userId },
        { members: { some: { userId } } },
        { communitySlug: { in: allowedCommunities.map((c) => c.toLowerCase()) } },
      ];
    }

    const groups = await prisma.group.findMany({
      where: whereCondition,
      include: {
        members: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((g) => {
      const isMember = userId ? g.members.some((m) => m.userId === userId) : false;
      const isAdmin = userId
        ? g.createdById === userId || g.members.some((m) => m.userId === userId && m.roleInGroup === 'ADMIN')
        : false;
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        type: g.type,
        communitySlug: g.communitySlug,
        maxCapacity: g.maxCapacity,
        currentMembersCount: g.members.length,
        isFull: g.members.length >= g.maxCapacity,
        onlyAdminCanPost: g.onlyAdminCanPost,
        hideMemberIdentity: g.hideMemberIdentity,
        membersCanSeeMemberList: g.membersCanSeeMemberList,
        createdById: g.createdById,
        isMember,
        isAdmin,
        createdAt: g.createdAt,
      };
    });
  }

  // Add / Join Member to Group (Strict Max Capacity & Category Enforcement)
  static async joinGroup(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) {
      throw new Error('Group not found or has been deleted');
    }

    const userProfile = await getUserCategoryProfile(userId);
    if (!userProfile || (!userProfile.isApproved && !userProfile.isSuperAdmin)) {
      throw new Error('RESTRICTED_NOT_APPROVED: Only APPROVED vendor accounts can join trade groups.');
    }

    const hasCategoryAccess =
      userProfile.isSuperAdmin ||
      userProfile.allowedCommunities.map((c) => c.toLowerCase()).includes((group.communitySlug || 'clothing').toLowerCase());

    if (!hasCategoryAccess) {
      throw new Error(`COMMUNITY_RESTRICTED: You cannot join group '${group.title}' because you do not share the '${group.communitySlug}' trade category.`);
    }

    if (group.members.length >= group.maxCapacity) {
      throw new Error(
        `GROUP_FULL: Maximum member limit reached (${group.members.length}/${group.maxCapacity} members). Cannot add more members.`
      );
    }

    const existingMember = group.members.find((m) => m.userId === userId);
    if (existingMember) {
      return {
        message: 'You are already a member of this group.',
        group,
      };
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        roleInGroup: 'MEMBER',
      },
    });

    return {
      message: `Successfully joined group '${group.title}'.`,
      currentMembersCount: group.members.length + 1,
      maxCapacity: group.maxCapacity,
    };
  }

  static async addMember(groupId: string, userToAddId: string, requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    if (!requester || requester.roleInGroup !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: Only Group Admin can add members to this group.');
    }

    if (group.members.length >= group.maxCapacity) {
      throw new Error(
        `GROUP_FULL: Maximum member limit reached (${group.members.length}/${group.maxCapacity} members). Cannot add more members.`
      );
    }

    const existingMember = group.members.find((m) => m.userId === userToAddId);
    if (existingMember) {
      throw new Error('User is already a member of this group.');
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userToAddId,
        roleInGroup: 'MEMBER',
      },
    });

    return {
      message: `User added successfully to ${group.title}.`,
      currentMembersCount: group.members.length + 1,
      maxCapacity: group.maxCapacity,
    };
  }

  // Get Member Suggestions for Group Admin (Filtered by Admin's Communities & Search)
  static async getSuggestedMembers(groupId: string, requestedById: string, search?: string, selectedCategory?: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requesterMember = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requesterMember?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can view member add suggestions.');
    }

    const requesterUser = await prisma.user.findUnique({
      where: { id: requestedById },
      include: { business: true },
    });

    const adminCommunities: string[] = requesterUser?.business?.allowedCommunities || ['clothing'];

    // Fetch 1-on-1 Chat Contacts of Group Admin from PostgreSQL
    const chatConversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: requestedById }, { user2Id: requestedById }],
      },
      include: {
        user1: { include: { business: true } },
        user2: { include: { business: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const chatContacts = chatConversations
      .filter((c) => c.user1.status === 'APPROVED' && c.user2.status === 'APPROVED')
      .map((c) => {
        const otherUser = c.user1Id === requestedById ? c.user2 : c.user1;
        const isAlreadyMember = group.members.some((m) => m.userId === otherUser.id);
        return {
          userId: otherUser.id,
          fullName: otherUser.fullName,
          mobileNumber: otherUser.mobileNumber,
          shopName: otherUser.business?.shopName || 'Verified Vendor',
          communities: otherUser.business?.allowedCommunities || ['clothing'],
          isAlreadyMember,
        };
      });

    // Fetch approved users from PostgreSQL
    const approvedUsers = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        id: { not: requestedById },
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { mobileNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { business: { shopName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        business: {
          select: {
            shopName: true,
            allowedCommunities: true,
          },
        },
      },
      take: 100,
    });

    const communityCounts = adminCommunities.map((comm) => {
      const count = approvedUsers.filter((u) => {
        const userComms = u.business?.allowedCommunities || ['clothing'];
        return userComms.includes(comm);
      }).length;
      return {
        category: comm,
        label: comm.charAt(0).toUpperCase() + comm.slice(1),
        count,
      };
    });

    const filteredUsers = approvedUsers.filter((u) => {
      const userComms = u.business?.allowedCommunities || ['clothing'];
      if (selectedCategory && selectedCategory !== 'ALL') {
        return userComms.includes(selectedCategory);
      }
      return adminCommunities.some((comm) => userComms.includes(comm));
    });

    const suggestions = filteredUsers.map((u) => {
      const isAlreadyMember = group.members.some((m) => m.userId === u.id);
      return {
        userId: u.id,
        fullName: u.fullName,
        mobileNumber: u.mobileNumber,
        shopName: u.business?.shopName || 'Verified Vendor',
        communities: u.business?.allowedCommunities || ['clothing'],
        isAlreadyMember,
      };
    });

    return {
      groupId: group.id,
      groupTitle: group.title,
      currentMembersCount: group.members.length,
      maxCapacity: group.maxCapacity,
      isFull: group.members.length >= group.maxCapacity,
      remainingSeats: Math.max(0, group.maxCapacity - group.members.length),
      chatContacts,
      adminCommunities,
      communityCounts,
      suggestions,
    };
  }

  // Bulk Add Selected Members to PostgreSQL Group
  static async bulkAddMembers(groupId: string, userIdsToAdd: string[], requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requesterMember = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requesterMember?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can add members.');
    }

    if (!Array.isArray(userIdsToAdd) || userIdsToAdd.length === 0) {
      throw new Error('No user IDs provided to add.');
    }

    const newIds = userIdsToAdd.filter((id) => !group.members.some((m) => m.userId === id));
    if (newIds.length === 0) {
      return {
        message: 'All selected users are already members of this group.',
        currentMembersCount: group.members.length,
        maxCapacity: group.maxCapacity,
      };
    }

    if (group.members.length + newIds.length > group.maxCapacity) {
      const remaining = group.maxCapacity - group.members.length;
      throw new Error(
        `GROUP_FULL: Group member limit reached (${group.members.length}/${group.maxCapacity}). You can only add ${remaining} more member(s).`
      );
    }

    await prisma.groupMember.createMany({
      data: newIds.map((userId) => ({
        groupId,
        userId,
        roleInGroup: 'MEMBER',
      })),
      skipDuplicates: true,
    });

    return {
      message: `Added ${newIds.length} member(s) to ${group.title} successfully.`,
      addedCount: newIds.length,
      currentMembersCount: group.members.length + newIds.length,
      maxCapacity: group.maxCapacity,
    };
  }

  // Leave Group
  static async leaveGroup(groupId: string, userId: string) {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!member) throw new Error('You are not a member of this group.');

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    return { message: 'You have left the group successfully.' };
  }

  // Remove Member by Group Admin
  static async removeMember(groupId: string, userIdToRemove: string, requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: true } } },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requester?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can remove members.');
    }

    const targetMember = group.members.find((m) => m.userId === userIdToRemove);
    if (!targetMember) throw new Error('User is not a member of this group.');

    if (targetMember.roleInGroup === 'ADMIN') {
      const adminCount = group.members.filter((m) => m.roleInGroup === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new Error('Cannot remove the sole Group Admin. Promote another member to admin first or delete the group.');
      }
    }

    await prisma.groupMember.delete({
      where: { id: targetMember.id },
    });

    return { message: `Member '${targetMember.user?.fullName || userIdToRemove}' removed from group successfully.` };
  }

  // Promote Member to Group Admin
  static async promoteMember(groupId: string, targetUserId: string, requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requester?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can promote members.');
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) throw new Error('User is not a member of this group.');

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { status: true, isVerified: true, fullName: true },
    });

    const isApproved = targetUser?.isVerified || targetUser?.status === 'APPROVED';
    if (!isApproved) {
      throw new Error(
        `UNAPPROVED_USER: Cannot promote user '${targetUser?.fullName || targetUserId}'. Only Super Admin APPROVED users can become Group Admins.`
      );
    }

    await prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { roleInGroup: 'ADMIN' },
    });

    return {
      message: `User '${targetUser?.fullName || targetUserId}' promoted to Group Admin successfully.`,
      targetUserId,
      roleInGroup: 'ADMIN',
    };
  }

  // Demote Group Admin to Member
  static async demoteMember(groupId: string, targetUserId: string, requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requester?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can demote admins.');
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) throw new Error('User is not a member of this group.');

    if (targetMember.roleInGroup !== 'ADMIN') {
      throw new Error('User is not a Group Admin.');
    }

    const adminCount = group.members.filter((m) => m.roleInGroup === 'ADMIN').length;
    if (adminCount <= 1) {
      throw new Error('Cannot demote the sole Group Admin. Promote another member first.');
    }

    await prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { roleInGroup: 'MEMBER' },
    });

    return {
      message: `Group Admin demoted to Member.`,
      targetUserId,
      roleInGroup: 'MEMBER',
    };
  }

  // Update Group Privacy Settings in PostgreSQL
  static async updateGroupSettings(groupId: string, requestedById: string, settings: any) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    const isViewerAdmin = requester?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isViewerAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can change group privacy settings.');
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(settings.hideMemberIdentity !== undefined && { hideMemberIdentity: Boolean(settings.hideMemberIdentity) }),
        ...(settings.membersCanSeeMemberList !== undefined && { membersCanSeeMemberList: Boolean(settings.membersCanSeeMemberList) }),
        ...(settings.onlyAdminCanPost !== undefined && { onlyAdminCanPost: Boolean(settings.onlyAdminCanPost) }),
        ...(settings.maxCapacity !== undefined && { maxCapacity: Math.min(Math.max(Number(settings.maxCapacity), 2), 500) }),
        ...(settings.title && { title: settings.title }),
        ...(settings.description !== undefined && { description: settings.description }),
      },
    });

    return {
      message: 'Group settings updated successfully.',
      group: {
        id: updatedGroup.id,
        title: updatedGroup.title,
        hideMemberIdentity: updatedGroup.hideMemberIdentity,
        membersCanSeeMemberList: updatedGroup.membersCanSeeMemberList,
        onlyAdminCanPost: updatedGroup.onlyAdminCanPost,
        maxCapacity: updatedGroup.maxCapacity,
      },
    };
  }

  // Super Admin Overrides Capacity
  static async updateGroupCapacity(groupId: string, newCapacity: number) {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { maxCapacity: newCapacity },
    });

    return {
      groupId: group.id,
      title: group.title,
      newMaxCapacity: group.maxCapacity,
      message: `Main Admin updated group '${group.title}' capacity to ${newCapacity} members.`,
    };
  }

  // Delete Group in PostgreSQL
  static async deleteGroup(groupId: string, requestedById: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or already deleted');

    const requester = group.members.find((m) => m.userId === requestedById);
    const isGroupAdmin = requester?.roleInGroup === 'ADMIN' || requestedById === group.createdById;
    if (!isGroupAdmin) {
      throw new Error('UNAUTHORIZED: Only Group Admin can delete this group.');
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { isDeleted: true },
    });

    return { message: 'Group deleted successfully for all members.' };
  }

  // Send Message in Group (Persisted to PostgreSQL with Idempotency)
  static async sendMessage(groupId: string, senderId: string, messageData: any) {
    if (messageData?.clientMessageId?.trim()) {
      const existingMessage = await prisma.groupMessage.findUnique({
        where: {
          senderId_clientMessageId: {
            senderId,
            clientMessageId: messageData.clientMessageId.trim(),
          },
        },
        include: {
          sender: { select: { fullName: true } },
        },
      });
      if (existingMessage) {
        return {
          id: existingMessage.id,
          groupId: existingMessage.groupId,
          senderId: existingMessage.senderId,
          clientMessageId: existingMessage.clientMessageId || undefined,
          senderName: existingMessage.sender?.fullName || 'Group Member',
          text: existingMessage.text,
          productCode: existingMessage.productCode,
          mediaUrl: existingMessage.mediaUrl,
          createdAt: existingMessage.createdAt,
        };
      }
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const member = group.members.find((m) => m.userId === senderId);
    if (!member) throw new Error('You are not a member of this group. Please join first.');

    if (group.onlyAdminCanPost && member.roleInGroup !== 'ADMIN') {
      throw new Error('POSTING_RESTRICTED: Only Group Admin can send messages in this group/broadcast channel.');
    }

    const user = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true },
    });

    const senderName = user?.fullName || 'Group Member';

    // Save Group Message permanently to PostgreSQL
    try {
      const newMessage = await prisma.groupMessage.create({
        data: {
          groupId,
          senderId,
          clientMessageId: messageData.clientMessageId?.trim() || null,
          text: messageData.text?.trim() || null,
          productCode: messageData.productCode?.trim() || null,
          mediaUrl: messageData.mediaUrl?.trim() || null,
        },
        include: {
          sender: { select: { fullName: true } },
        },
      });

      // Touch group updatedAt timestamp
      await prisma.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });

      return {
        id: newMessage.id,
        groupId: newMessage.groupId,
        senderId: newMessage.senderId,
        clientMessageId: newMessage.clientMessageId || undefined,
        senderName: newMessage.sender?.fullName || senderName,
        text: newMessage.text,
        productCode: newMessage.productCode,
        mediaUrl: newMessage.mediaUrl,
        createdAt: newMessage.createdAt,
      };
    } catch (err: any) {
      if (err?.code === 'P2002' && messageData?.clientMessageId?.trim()) {
        const existingMessage = await prisma.groupMessage.findUnique({
          where: {
            senderId_clientMessageId: {
              senderId,
              clientMessageId: messageData.clientMessageId.trim(),
            },
          },
          include: { sender: { select: { fullName: true } } },
        });
        if (existingMessage) {
          return {
            id: existingMessage.id,
            groupId: existingMessage.groupId,
            senderId: existingMessage.senderId,
            clientMessageId: existingMessage.clientMessageId || undefined,
            senderName: existingMessage.sender?.fullName || senderName,
            text: existingMessage.text,
            productCode: existingMessage.productCode,
            mediaUrl: existingMessage.mediaUrl,
            createdAt: existingMessage.createdAt,
          };
        }
      }
      throw err;
    }
  }

  // Get Group Details with Privacy Rules Enforced from PostgreSQL
  static async getGroupDetails(groupId: string, viewerId: string, options?: { limit?: number; before?: string }) {
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 100);

    let whereCursor: any = {};
    if (options?.before) {
      const beforeStr = options.before.trim();
      let cursorDate: Date | null = null;
      let cursorId: string | null = null;

      if (beforeStr.includes('_')) {
        const [datePart, idPart] = beforeStr.split('_');
        const parsedDate = new Date(datePart);
        if (!isNaN(parsedDate.getTime())) {
          cursorDate = parsedDate;
          cursorId = idPart;
        }
      } else {
        const cursorMessage = await prisma.groupMessage.findUnique({
          where: { id: beforeStr },
          select: { createdAt: true, id: true },
        });
        if (cursorMessage) {
          cursorDate = cursorMessage.createdAt;
          cursorId = cursorMessage.id;
        } else {
          const parsedDate = new Date(beforeStr);
          if (!isNaN(parsedDate.getTime())) {
            cursorDate = parsedDate;
          }
        }
      }

      if (cursorDate && cursorId) {
        whereCursor = {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursorId },
            },
          ],
        };
      } else if (cursorDate) {
        whereCursor = {
          createdAt: { lt: cursorDate },
        };
      }
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, mobileNumber: true } },
          },
        },
        messages: {
          where: {
            ...whereCursor,
          },
          take: limit,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: {
            sender: { select: { fullName: true } },
          },
        },
      },
    });


    if (!group || group.isDeleted) throw new Error('Group not found or has been deleted');

    const viewer = group.members.find((m) => m.userId === viewerId);

    if (!viewer) {
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        type: group.type,
        onlyAdminCanPost: group.onlyAdminCanPost,
        hideMemberIdentity: group.hideMemberIdentity,
        membersCanSeeMemberList: group.membersCanSeeMemberList,
        maxCapacity: group.maxCapacity,
        currentMembersCount: group.members.length,
        isFull: group.members.length >= group.maxCapacity,
        isMember: false,
        isViewerAdmin: false,
        members: [],
        messages: [],
      };
    }

    const isViewerAdmin = viewer.roleInGroup === 'ADMIN' || viewerId === group.createdById;

    // RULE 1: HIDE MEMBER IDENTITY ENFORCEMENT
    const privacyFilteredMessages = group.messages.map((msg) => {
      const isSelf = msg.senderId === viewerId;
      const canSeeSender = !group.hideMemberIdentity || isViewerAdmin || isSelf;

      return {
        id: msg.id,
        text: msg.text,
        productCode: msg.productCode,
        mediaUrl: msg.mediaUrl,
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        isSelf,
        senderId: canSeeSender ? msg.senderId : undefined,
        senderName: canSeeSender ? msg.sender.fullName || 'Member' : 'Member (Identity Protected)',
      };
    });

    // RULE 2: SHOW GROUP MEMBERS ENFORCEMENT
    let memberList: any[] = [];

    if (isViewerAdmin) {
      memberList = group.members.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        mobileNumber: m.user.mobileNumber,
        roleInGroup: m.roleInGroup,
        joinedAt: m.joinedAt,
      }));
    } else if (group.membersCanSeeMemberList) {
      memberList = group.members.map((m, idx) => ({
        userId: m.userId,
        roleInGroup: m.roleInGroup,
        fullName: m.userId === viewerId ? m.user.fullName : `Member #${idx + 1}`,
        mobileNumber: m.userId === viewerId ? m.user.mobileNumber : '••••••••••',
      }));
    } else {
      memberList = [];
    }

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      type: group.type,
      onlyAdminCanPost: group.onlyAdminCanPost,
      hideMemberIdentity: group.hideMemberIdentity,
      membersCanSeeMemberList: group.membersCanSeeMemberList,
      maxCapacity: group.maxCapacity,
      currentMembersCount: group.members.length,
      isFull: group.members.length >= group.maxCapacity,
      isMember: true,
      isViewerAdmin,
      members: memberList,
      messages: privacyFilteredMessages,
    };
  }

  /**
   * Edit a sent group message text.
   */
  static async editGroupMessage(userId: string, messageId: string, newText: string) {
    const message = await prisma.groupMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found.');
    if (message.senderId !== userId) throw new Error('UNAUTHORIZED: You can only edit your own messages.');

    const updated = await prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        text: newText.trim(),
        isEdited: true,
      },
      include: {
        sender: { select: { fullName: true } },
      },
    });

    return updated;
  }

  static async getOrCreateInviteToken(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found');

    const member = group.members.find((m) => m.userId === userId);
    if (!member || member.roleInGroup !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: Only group admins can generate invite links');
    }

    if (group.inviteToken) {
      return { inviteToken: group.inviteToken };
    }

    const inviteToken = `grp_inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await prisma.group.update({
      where: { id: groupId },
      data: { inviteToken },
    });

    return { inviteToken };
  }

  static async joinViaInviteToken(userId: string, inviteToken: string) {
    const group = await prisma.group.findUnique({
      where: { inviteToken },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('INVITE_INVALID: Invalid or expired group invite link');

    if (group.members.length >= group.maxCapacity) {
      throw new Error(`GROUP_FULL: Group capacity limit reached (${group.members.length}/${group.maxCapacity})`);
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) {
      return { message: 'Already a member', group };
    }

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        roleInGroup: 'MEMBER',
      },
    });

    return { message: `Joined ${group.title} successfully`, group };
  }

  static async createJoinRequest(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found');

    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) throw new Error('Already a member of this group');

    const existingReq = await prisma.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingReq) {
      if (existingReq.status === 'PENDING') return { message: 'Join request already pending', request: existingReq };
      if (existingReq.status === 'REJECTED') {
        const updated = await prisma.groupJoinRequest.update({
          where: { id: existingReq.id },
          data: { status: 'PENDING' },
        });
        return { message: 'Join request resubmitted', request: updated };
      }
    }

    const request = await prisma.groupJoinRequest.create({
      data: { groupId, userId, status: 'PENDING' },
    });

    return { message: 'Join request submitted for admin approval', request };
  }

  static async getPendingJoinRequests(groupId: string, adminUserId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found');

    const admin = group.members.find((m) => m.userId === adminUserId);
    if (!admin || admin.roleInGroup !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: Only group admins can review join requests');
    }

    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId, status: 'PENDING' },
      include: { user: { select: { id: true, fullName: true, mobileNumber: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  static async approveJoinRequest(groupId: string, requestId: string, adminUserId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found');

    const admin = group.members.find((m) => m.userId === adminUserId);
    if (!admin || admin.roleInGroup !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: Only group admins can approve requests');
    }

    const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!req || req.groupId !== groupId) throw new Error('Request not found');

    if (group.members.length >= group.maxCapacity) {
      throw new Error('GROUP_FULL: Cannot approve request. Group max capacity reached.');
    }

    await prisma.$transaction([
      prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      }),
      prisma.groupMember.upsert({
        where: { groupId_userId: { groupId, userId: req.userId } },
        update: {},
        create: { groupId, userId: req.userId, roleInGroup: 'MEMBER' },
      }),
    ]);

    return { message: 'Join request approved and member added successfully' };
  }

  static async rejectJoinRequest(groupId: string, requestId: string, adminUserId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.isDeleted) throw new Error('Group not found');

    const admin = group.members.find((m) => m.userId === adminUserId);
    if (!admin || admin.roleInGroup !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: Only group admins can reject requests');
    }

    await prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { message: 'Join request rejected' };
  }
}
