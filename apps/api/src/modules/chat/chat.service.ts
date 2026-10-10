import { prisma } from '@b2b/database';

function getNormalizedCommunities(business?: { allowedCommunities?: string[] } | null): string[] {
  if (business?.allowedCommunities && Array.isArray(business.allowedCommunities) && business.allowedCommunities.length > 0) {
    return business.allowedCommunities.map((c) => c.trim().toLowerCase());
  }
  return ['clothing']; // Default fallback trade community if empty or unspecified
}

function checkCommunityAccess(user1?: any, user2?: any): boolean {
  if (!user1 || !user2) return false;

  const isUser1Admin =
    user1.email === 'dnpatel2002@gmail.com' ||
    user1.business?.assignedRole === 'SUPER_ADMIN' ||
    user1.assignedRole === 'SUPER_ADMIN';
  const isUser2Admin =
    user2.email === 'dnpatel2002@gmail.com' ||
    user2.business?.assignedRole === 'SUPER_ADMIN' ||
    user2.assignedRole === 'SUPER_ADMIN';

  if (isUser1Admin || isUser2Admin) return true;

  const comms1 = getNormalizedCommunities(user1.business);
  const comms2 = getNormalizedCommunities(user2.business);

  return comms1.some((c) => comms2.includes(c));
}

export class ChatService {
  /**
   * Search for other APPROVED users by mobile number, name, or shop name.
   * Restricts search strictly to active users and matching allowedCommunities.
   */
  static async searchApprovedUsers(currentUserId: string, search: string) {
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { business: true },
    });

    if (!currentUser || currentUser.status === 'BLOCKED' || (currentUser.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blocked by Super Admin.');
    }

    if (!search || search.trim().length === 0) {
      return [];
    }

    const cleanQuery = search.trim();
    const userCommunities = getNormalizedCommunities(currentUser.business);
    const isSuperAdmin =
      currentUser.email === 'dnpatel2002@gmail.com' ||
      currentUser.business?.assignedRole === 'SUPER_ADMIN';

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { status: { notIn: ['BLOCKED', 'BLACK'] } },
          { id: { not: currentUserId } },
          ...(!isSuperAdmin
            ? [
                {
                  OR: [
                    {
                      business: {
                        allowedCommunities: {
                          hasSome: userCommunities,
                        },
                      },
                    },
                    {
                      business: {
                        allowedCommunities: {
                          isEmpty: true,
                        },
                      },
                    },
                    {
                      business: {
                        is: null,
                      },
                    },
                  ],
                },
              ]
            : []),
          {
            OR: [
              { mobileNumber: cleanQuery },
              { mobileNumber: { contains: cleanQuery, mode: 'insensitive' } },
              { fullName: { contains: cleanQuery, mode: 'insensitive' } },
              { business: { shopName: { contains: cleanQuery, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        status: true,
        isVerified: true,
        business: {
          select: {
            shopName: true,
            assignedRole: true,
            allowedCommunities: true,
          },
        },
      },
      take: 20,
    });

    return users.map((u) => ({
      userId: u.id,
      fullName: u.fullName,
      mobileNumber: u.mobileNumber,
      shopName: u.business?.shopName || 'Independent Shop',
      assignedRole: u.business?.assignedRole || 'RETAILER',
      status: u.status,
      isVerified: u.isVerified,
      allowedCommunities: u.business?.allowedCommunities || ['clothing'],
    }));
  }

  /**
   * Get an existing conversation or create a new one between two users.
   * Enforces backend status check and community authorization on BOTH sender and recipient.
   */
  static async getOrCreateConversation(senderId: string, targetIdentifier: string) {
    // 1. Verify Sender Account Status & Communities
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { business: true },
    });

    if (!sender || sender.status === 'BLOCKED' || (sender.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blocked by Super Admin.');
    }

    // 2. Find Recipient by User ID or Mobile Number
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetIdentifier },
          { mobileNumber: targetIdentifier },
        ],
      },
      include: { business: true },
    });

    if (!recipient) {
      throw new Error('User account not found.');
    }

    if (recipient.id === senderId) {
      throw new Error('Cannot start a chat conversation with yourself.');
    }

    // 3. Verify Recipient Account Status
    if (recipient.status === 'BLOCKED' || (recipient.status as string) === 'BLACK') {
      throw new Error(`USER_BLOCKED: Target user '${recipient.fullName}' is currently blocked by Super Admin.`);
    }

    // 4. Verify Community Authorization
    if (!checkCommunityAccess(sender, recipient)) {
      throw new Error('COMMUNITY_RESTRICTED: Messaging is restricted to users within your allowed business communities.');
    }

    // 5. Find existing conversation between senderId and recipient.id
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: recipient.id },
          { user1Id: recipient.id, user2Id: senderId },
        ],
      },
      include: {
        user1: { include: { business: true } },
        user2: { include: { business: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 6. Create new conversation if none exists
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          user1Id: senderId,
          user2Id: recipient.id,
        },
        include: {
          user1: { include: { business: true } },
          user2: { include: { business: true } },
          messages: {
            take: 1,
          },
        },
      });
    }

    const otherUser = conversation.user1Id === senderId ? conversation.user2 : conversation.user1;

    return {
      conversationId: conversation.id,
      participant: {
        userId: otherUser.id,
        fullName: otherUser.fullName,
        mobileNumber: otherUser.mobileNumber,
        shopName: otherUser.business?.shopName || 'Shop Account',
        assignedRole: otherUser.business?.assignedRole || 'RETAILER',
        status: otherUser.status,
        isVerified: otherUser.isVerified,
        allowedCommunities: otherUser.business?.allowedCommunities || ['clothing'],
      },
      lastMessage: conversation.messages[0] || null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Fetch all conversations for the authenticated user.
   * Restricts list strictly to active participants with matching allowedCommunities.
   */
  static async getUserConversations(userId: string) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!currentUser || currentUser.status === 'BLOCKED' || (currentUser.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blocked by Super Admin.');
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      include: {
        user1: { include: { business: true } },
        user2: { include: { business: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const validConversations = conversations.filter((c) => {
      if (c.user1.status === 'BLOCKED' || c.user2.status === 'BLOCKED') return false;
      return checkCommunityAccess(c.user1, c.user2);
    });

    const convIds = validConversations.map((c) => c.id);

    // Calculate unread counts for messages sent by the other user that are not read
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: convIds },
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      _count: { id: true },
    });

    const unreadMap: Record<string, number> = {};
    for (const item of unreadCounts) {
      unreadMap[item.conversationId] = item._count.id;
    }

    return validConversations
      .map((c) => {
        const otherUser = c.user1Id === userId ? c.user2 : c.user1;
        const lastMsg = c.messages[0] || null;
        const lastTime = lastMsg?.createdAt
          ? new Date(lastMsg.createdAt).getTime()
          : new Date(c.updatedAt || c.createdAt).getTime();

        return {
          conversationId: c.id,
          participant: {
            userId: otherUser.id,
            fullName: otherUser.fullName,
            mobileNumber: otherUser.mobileNumber,
            shopName: otherUser.business?.shopName || 'Shop Account',
            assignedRole: otherUser.business?.assignedRole || 'RETAILER',
            status: otherUser.status,
            isVerified: otherUser.isVerified,
            allowedCommunities: otherUser.business?.allowedCommunities || ['clothing'],
          },
          lastMessage: lastMsg,
          unreadCount: unreadMap[c.id] || 0,
          updatedAt: c.updatedAt,
          sortTime: lastTime,
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  /**
   * Get all messages for a specific conversation.
   * Verifies user membership, account status, and allowedCommunities match.
   */
  static async getConversationMessages(userId: string, conversationId: string, options?: { limit?: number; before?: string }) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || currentUser.status === 'BLOCKED' || (currentUser.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blocked by Super Admin.');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: { include: { business: true } },
        user2: { include: { business: true } },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new Error('Access denied to this conversation.');
    }

    if (conversation.user1.status === 'BLOCKED' || conversation.user2.status === 'BLOCKED') {
      throw new Error('USER_BLOCKED: Messaging is disabled because one or both participants are blocked.');
    }

    if (!checkCommunityAccess(conversation.user1, conversation.user2)) {
      throw new Error('COMMUNITY_RESTRICTED: You cannot view messages with vendors from a different trade category.');
    }

    const otherUser = conversation.user1Id === userId ? conversation.user2 : conversation.user1;

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
        const cursorMessage = await prisma.message.findUnique({
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

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...whereCursor,
      },
      include: {
        replyToMessage: {
          select: {
            id: true,
            text: true,
            senderId: true,
            productCode: true,
            mediaUrl: true,
            sender: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    // Auto mark unread incoming messages in this conversation as READ
    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    return {
      conversationId: conversation.id,
      participant: {
        userId: otherUser.id,
        fullName: otherUser.fullName,
        mobileNumber: otherUser.mobileNumber,
        shopName: otherUser.business?.shopName || 'Shop Account',
        assignedRole: otherUser.business?.assignedRole || 'RETAILER',
        status: otherUser.status,
        isVerified: otherUser.isVerified,
        allowedCommunities: otherUser.business?.allowedCommunities || ['clothing'],
      },
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        clientMessageId: m.clientMessageId || undefined,
        text: m.text,
        productCode: m.productCode,
        mediaUrl: m.mediaUrl,
        replyToId: m.replyToId || undefined,
        replyToMessage: m.replyToMessage
          ? {
              id: m.replyToMessage.id,
              text: m.replyToMessage.text,
              senderId: m.replyToMessage.senderId,
              senderName: m.replyToMessage.sender?.fullName || 'User',
              productCode: m.replyToMessage.productCode,
              mediaUrl: m.replyToMessage.mediaUrl,
            }
          : undefined,
        isForwarded: m.isForwarded,
        forwardCount: m.forwardCount || 0,
        isForwardedManyTimes: (m.forwardCount || 0) >= 5,
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        status: m.status || 'SENT',
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Explicitly mark all unread messages in a conversation as READ for current user.
   */
  static async markConversationAsRead(userId: string, conversationId: string, ioServer?: any) {
    const updated = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    if (ioServer) {
      ioServer.to(conversationId).emit('message_status_update', {
        conversationId,
        status: 'READ',
        readerId: userId,
      });
    }

    return { success: true, updatedCount: updated.count };
  }

  /**
   * Send a real-time chat message.
   * Strict backend verification that BOTH sender and recipient share trade category access.
   */
  static async sendMessage(
    senderId: string,
    conversationId: string,
    data: { text?: string; productCode?: string; mediaUrl?: string; clientMessageId?: string; replyToId?: string; isForwarded?: boolean; forwardCount?: number }
  ) {
    // 0. Idempotency Check: Return existing message if duplicate retry
    if (data.clientMessageId?.trim()) {
      const existingMessage = await prisma.message.findUnique({
        where: {
          senderId_clientMessageId: {
            senderId,
            clientMessageId: data.clientMessageId.trim(),
          },
        },
      });
      if (existingMessage) {
        return existingMessage;
      }
    }

    // 1. Verify Sender Status
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { business: true },
    });

    if (!sender || sender.status === 'BLOCKED' || (sender.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blocked by Super Admin.');
    }

    // 2. Fetch Conversation and Participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: { include: { business: true } },
        user2: { include: { business: true } },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
      throw new Error('Access denied to this conversation.');
    }

    const recipient = conversation.user1Id === senderId ? conversation.user2 : conversation.user1;

    // 3. Verify Recipient Status & Allowed Categories
    if (recipient.status === 'BLOCKED' || (recipient.status as string) === 'BLACK') {
      throw new Error(`USER_BLOCKED: Recipient '${recipient.fullName}' is currently blocked.`);
    }

    if (!checkCommunityAccess(sender, recipient)) {
      throw new Error('COMMUNITY_RESTRICTED: Direct Chat is permitted only between users who share at least one active trade category. You cannot message users without a matching category.');
    }

    // Rule 6: Share in Chat Content Access Validation
    if (data.productCode?.trim()) {
      const product = await prisma.product.findUnique({
        where: { code: data.productCode.trim() },
        include: { community: true, business: true },
      });

      if (product) {
        const prodCat = (product.community?.slug || 'clothing').toLowerCase();
        const senderComms = getNormalizedCommunities(sender.business);
        const recipientComms = getNormalizedCommunities(recipient.business);
        const isSuperAdmin =
          sender.business?.assignedRole === 'SUPER_ADMIN' ||
          recipient.business?.assignedRole === 'SUPER_ADMIN' ||
          sender.email === 'dnpatel2002@gmail.com' ||
          recipient.email === 'dnpatel2002@gmail.com';

        const senderCanSee = isSuperAdmin || senderComms.includes(prodCat);
        const recipientCanSee = isSuperAdmin || recipientComms.includes(prodCat);

        if (!senderCanSee || !recipientCanSee) {
          throw new Error('COMMUNITY_RESTRICTED: Cannot share content in chat from a category not shared by both participants.');
        }
      }
    }

    if (!data.text?.trim() && !data.productCode?.trim() && !data.mediaUrl?.trim()) {
      throw new Error('Message content cannot be empty.');
    }

    // 4. Create Message in Database (with P2002 duplicate retry handling)
    try {
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          clientMessageId: data.clientMessageId?.trim() || null,
          replyToId: data.replyToId?.trim() || null,
          text: data.text?.trim() || null,
          productCode: data.productCode?.trim() || null,
          mediaUrl: data.mediaUrl?.trim() || null,
          isForwarded: !!data.isForwarded,
          forwardCount: Number(data.forwardCount) || 0,
        },
        include: {
          replyToMessage: {
            select: {
              id: true,
              text: true,
              senderId: true,
              productCode: true,
              mediaUrl: true,
              sender: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      // 5. Touch Conversation updatedAt
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return {
        ...message,
        status: message.status || 'SENT',
        replyToMessage: message.replyToMessage
          ? {
              id: message.replyToMessage.id,
              text: message.replyToMessage.text,
              senderId: message.replyToMessage.senderId,
              senderName: message.replyToMessage.sender?.fullName || 'User',
              productCode: message.replyToMessage.productCode,
              mediaUrl: message.replyToMessage.mediaUrl,
            }
          : undefined,
        isForwardedManyTimes: (message.forwardCount || 0) >= 5,
      };
    } catch (err: any) {
      if (err?.code === 'P2002' && data.clientMessageId?.trim()) {
        const existingMessage = await prisma.message.findUnique({
          where: {
            senderId_clientMessageId: {
              senderId,
              clientMessageId: data.clientMessageId.trim(),
            },
          },
        });
        if (existingMessage) return existingMessage;
      }
      throw err;
    }
  }

  /**
   * React to a direct message with an emoji reaction.
   */
  static async reactToMessage(userId: string, messageId: string, emoji: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found.');

    const currentReactions: Array<{ userId: string; emoji: string }> = Array.isArray(message.reactions)
      ? (message.reactions as any)
      : [];

    const existingIndex = currentReactions.findIndex((r) => r.userId === userId);
    if (existingIndex >= 0) {
      if (currentReactions[existingIndex].emoji === emoji) {
        currentReactions.splice(existingIndex, 1);
      } else {
        currentReactions[existingIndex].emoji = emoji;
      }
    } else {
      currentReactions.push({ userId, emoji });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: currentReactions },
    });

    return updated;
  }

  /**
   * Edit a direct message text.
   */
  static async editMessage(userId: string, messageId: string, newText: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found.');
    if (message.senderId !== userId) throw new Error('UNAUTHORIZED: You can only edit your own messages.');

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        text: newText.trim(),
        isEdited: true,
      },
    });

    return updated;
  }

  /**
   * Soft delete a message ("Delete for everyone").
   */
  static async deleteMessage(userId: string, messageId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found.');
    if (message.senderId !== userId) throw new Error('UNAUTHORIZED: You can only delete your own messages.');

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        text: 'This message was deleted',
        mediaUrl: null,
        productCode: null,
        isDeleted: true,
      },
    });

    return updated;
  }

  /**
   * Block or unblock a user.
   */
  static async toggleBlockUser(blockerId: string, targetUserId: string) {
    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId: targetUserId,
        },
      },
    });

    if (existing) {
      await prisma.userBlock.delete({ where: { id: existing.id } });
      return { isBlocked: false, message: 'User unblocked successfully.' };
    } else {
      await prisma.userBlock.create({
        data: {
          blockerId,
          blockedUserId: targetUserId,
        },
      });
      return { isBlocked: true, message: 'User blocked successfully.' };
    }
  }

  /**
   * Update conversation settings (Pin, Archive, Mute).
   */
  static async updateConversationSetting(
    userId: string,
    conversationId: string,
    settings: { isPinned?: boolean; isArchived?: boolean; isMuted?: boolean }
  ) {
    const setting = await prisma.conversationSetting.upsert({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      update: {
        ...(settings.isPinned !== undefined && { isPinned: settings.isPinned }),
        ...(settings.isArchived !== undefined && { isArchived: settings.isArchived }),
        ...(settings.isMuted !== undefined && { isMuted: settings.isMuted }),
      },
      create: {
        userId,
        conversationId,
        isPinned: settings.isPinned || false,
        isArchived: settings.isArchived || false,
        isMuted: settings.isMuted || false,
      },
    });

    return setting;
  }

  /**
   * Forward a message to one or multiple eligible conversations / groups.
   * Capped at 5 chats normally; capped at 1 chat if forwarded 5 or more times.
   */
  static async forwardMessage(
    senderId: string,
    data: {
      messageId: string;
      messageType?: 'DIRECT' | 'GROUP';
      targetConversationIds?: string[];
      targetGroupIds?: string[];
    }
  ) {
    const { messageId, messageType = 'DIRECT', targetConversationIds = [], targetGroupIds = [] } = data;
    const totalTargets = targetConversationIds.length + targetGroupIds.length;

    if (totalTargets === 0) {
      throw new Error('No target conversations or groups specified for forwarding.');
    }

    let originalText: string | null = null;
    let originalProductCode: string | null = null;
    let originalMediaUrl: string | null = null;
    let currentForwardCount = 0;

    if (messageType === 'GROUP') {
      const orig = await prisma.groupMessage.findUnique({ where: { id: messageId } });
      if (!orig) throw new Error('Original group message not found.');
      originalText = orig.text;
      originalProductCode = orig.productCode;
      originalMediaUrl = orig.mediaUrl;
      currentForwardCount = orig.forwardCount || (orig.isForwarded ? 1 : 0);
    } else {
      const orig = await prisma.message.findUnique({ where: { id: messageId } });
      if (!orig) throw new Error('Original message not found.');
      originalText = orig.text;
      originalProductCode = orig.productCode;
      originalMediaUrl = orig.mediaUrl;
      currentForwardCount = orig.forwardCount || (orig.isForwarded ? 1 : 0);
    }

    const newForwardCount = currentForwardCount + 1;
    const isManyTimes = currentForwardCount >= 5 || newForwardCount >= 5;

    if (isManyTimes && totalTargets > 1) {
      throw new Error('FORWARD_RESTRICTED: Messages forwarded 5 or more times can only be forwarded to 1 chat at a time.');
    }

    if (!isManyTimes && totalTargets > 5) {
      throw new Error('FORWARD_LIMIT_EXCEEDED: You can only forward to up to 5 chats at a time.');
    }

    const createdMessages: any[] = [];

    // Forward to direct conversations
    for (const convId of targetConversationIds) {
      const created = await ChatService.sendMessage(senderId, convId, {
        text: originalText || undefined,
        productCode: originalProductCode || undefined,
        mediaUrl: originalMediaUrl || undefined,
        isForwarded: true,
        forwardCount: newForwardCount,
      });
      createdMessages.push(created);
    }

    // Forward to groups
    for (const grpId of targetGroupIds) {
      const grpMsg = await prisma.groupMessage.create({
        data: {
          groupId: grpId,
          senderId,
          text: originalText,
          productCode: originalProductCode,
          mediaUrl: originalMediaUrl,
          isForwarded: true,
          forwardCount: newForwardCount,
        },
      });
      createdMessages.push({ ...grpMsg, isForwardedManyTimes: isManyTimes });
    }

    return {
      success: true,
      forwardCount: newForwardCount,
      isForwardedManyTimes: isManyTimes,
      messages: createdMessages,
    };
  }
}


