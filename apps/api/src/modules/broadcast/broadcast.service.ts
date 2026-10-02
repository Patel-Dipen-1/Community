import { prisma } from '@b2b/database';
import { AuthorizationService } from '../admin/authz.service';
import { ChatService } from '../chat/chat.service';

export interface CreateBroadcastInput {
  title: string;
  description?: string;
  recipientIds: string[];
}

export interface SendBroadcastInput {
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  mediaType?: string; // TEXT, EMOJI, IMAGE, VIDEO, DOCUMENT, AUDIO, VOICE, PRODUCT, POST, LINK
  attachments?: { url: string; mediaType?: string }[];
  clientMessageId?: string;
}

export class BroadcastService {
  /**
   * Filter and validate recipient User IDs against user contact permissions:
   * 1. Target user exists and is APPROVED
   * 2. Target user shares at least one active trade community with sender (or sender/recipient is SUPER_ADMIN)
   * 3. Communication is not blocked
   * 4. De-duplicate list of recipient IDs
   */
  static async validateAndFilterRecipients(creatorId: string, recipientIds: string[]) {
    // De-duplicate recipient IDs
    const uniqueIds = Array.from(new Set((recipientIds || []).filter((id) => id && id !== creatorId)));

    if (uniqueIds.length === 0) {
      return [];
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { business: true },
    });

    if (!creator || creator.status !== 'APPROVED') {
      throw new Error('RESTRICTED_NOT_APPROVED: Only APPROVED accounts can manage broadcast lists.');
    }

    const creatorComms = creator.business?.allowedCommunities || ['clothing'];
    const isCreatorSuperAdmin =
      creator.email === 'dnpatel2002@gmail.com' ||
      creator.business?.assignedRole === 'SUPER_ADMIN';

    // Fetch candidate recipient users with business details
    const candidateUsers = await prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        status: 'APPROVED',
      },
      include: { business: true },
    });

    // Check user blocks
    const userBlocks = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: creatorId, blockedUserId: { in: uniqueIds } },
          { blockerId: { in: uniqueIds }, blockedUserId: creatorId },
        ],
      },
    });

    const blockedUserIds = new Set([
      ...userBlocks.map((b) => b.blockerId),
      ...userBlocks.map((b) => b.blockedUserId),
    ]);

    const validRecipients = candidateUsers.filter((user) => {
      if (blockedUserIds.has(user.id)) return false;

      const targetComms = user.business?.allowedCommunities || ['clothing'];
      const isTargetSuperAdmin =
        user.email === 'dnpatel2002@gmail.com' ||
        user.business?.assignedRole === 'SUPER_ADMIN';

      const hasSharedCommunity =
        isCreatorSuperAdmin ||
        isTargetSuperAdmin ||
        creatorComms.some((cat) => targetComms.includes(cat));

      return hasSharedCommunity;
    });

    return validRecipients;
  }

  /**
   * Create a new Broadcast List
   */
  static async createBroadcastList(creatorId: string, data: CreateBroadcastInput) {
    const { title, description, recipientIds } = data;

    if (!title || title.trim().length === 0) {
      throw new Error('Broadcast list title is required.');
    }

    // 1. Evaluate broadcast.enabled and broadcast.create feature flags
    const featureCheck = await AuthorizationService.checkUserPermission(
      creatorId,
      'BROADCAST.CREATE',
      'BROADCAST'
    );
    if (!featureCheck.allowed) {
      throw new Error(featureCheck.reason || 'Broadcast feature is disabled or not permitted for your plan/role.');
    }

    // 2. Evaluate Maximum Broadcast Lists per user limit
    const existingListCount = await prisma.broadcastList.count({
      where: { creatorId },
    });

    const listLimitCheck = await AuthorizationService.evaluateUserLimit(
      creatorId,
      'BROADCAST.MAX_LISTS',
      existingListCount
    );

    if (listLimitCheck.isEnforced && !listLimitCheck.isAllowed) {
      throw new Error(`Broadcast list limit reached (${existingListCount}/${listLimitCheck.max}). Upgrade your subscription plan or contact admin to increase list limits.`);
    }

    // 3. Validate and filter recipient list
    const validRecipientUsers = await this.validateAndFilterRecipients(creatorId, recipientIds);
    const validRecipientIds = validRecipientUsers.map((u) => u.id);

    // 4. Evaluate Maximum Recipients Per List limit
    const recipientLimitCheck = await AuthorizationService.evaluateUserLimit(
      creatorId,
      'BROADCAST.MAX_RECIPIENTS_PER_LIST',
      validRecipientIds.length
    );

    if (recipientLimitCheck.isEnforced && validRecipientIds.length > recipientLimitCheck.max) {
      throw new Error(`Maximum recipient limit exceeded per broadcast list (${validRecipientIds.length}/${recipientLimitCheck.max}). Please select fewer contacts.`);
    }

    // 5. Create Broadcast List & Recipient records in DB
    const list = await prisma.broadcastList.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        creatorId,
        recipients: {
          create: validRecipientIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        recipients: {
          include: {
            user: {
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
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      id: list.id,
      title: list.title,
      description: list.description,
      creatorId: list.creatorId,
      recipientCount: list.recipients.length,
      recipients: list.recipients.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        mobileNumber: r.user.mobileNumber,
        shopName: r.user.business?.shopName || 'Shop Account',
        assignedRole: r.user.business?.assignedRole || 'RETAILER',
        isVerified: r.user.isVerified,
      })),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  /**
   * Fetch all Broadcast Lists created by user
   */
  static async getUserBroadcastLists(userId: string) {
    const lists = await prisma.broadcastList.findMany({
      where: { creatorId: userId },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
                business: {
                  select: { shopName: true, assignedRole: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return lists.map((list) => ({
      id: list.id,
      title: list.title,
      description: list.description,
      recipientCount: list.recipients.length,
      recipients: list.recipients.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        mobileNumber: r.user.mobileNumber,
        shopName: r.user.business?.shopName || 'Shop Account',
        assignedRole: r.user.business?.assignedRole || 'RETAILER',
        isVerified: r.user.isVerified,
      })),
      lastMessage: list.messages[0] || null,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));
  }

  /**
   * Get single Broadcast List details (Creator Privacy Enforced)
   */
  static async getBroadcastDetails(userId: string, listId: string) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
                business: {
                  select: { shopName: true, assignedRole: true, allowedCommunities: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            deliveries: {
              include: {
                recipient: {
                  select: { id: true, fullName: true, mobileNumber: true },
                },
              },
            },
          },
        },
      },
    });

    if (!list) {
      throw new Error('Broadcast list not found.');
    }

    if (list.creatorId !== userId) {
      throw new Error('UNAUTHORIZED: You can only access your own broadcast lists.');
    }

    return {
      id: list.id,
      title: list.title,
      description: list.description,
      creatorId: list.creatorId,
      recipientCount: list.recipients.length,
      recipients: list.recipients.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        mobileNumber: r.user.mobileNumber,
        shopName: r.user.business?.shopName || 'Shop Account',
        assignedRole: r.user.business?.assignedRole || 'RETAILER',
        isVerified: r.user.isVerified,
      })),
      messages: list.messages,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  /**
   * Update Broadcast List details (Rename / update recipients)
   */
  static async updateBroadcastList(
    userId: string,
    listId: string,
    data: { title?: string; description?: string; recipientIds?: string[] }
  ) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== userId) throw new Error('UNAUTHORIZED: You can only edit your own broadcast lists.');

    // Feature Check
    const featureCheck = await AuthorizationService.checkUserPermission(
      userId,
      'BROADCAST.EDIT',
      'BROADCAST'
    );
    if (!featureCheck.allowed) {
      throw new Error(featureCheck.reason || 'Broadcast editing is disabled.');
    }

    let recipientIdsToSet: string[] | undefined = undefined;

    if (data.recipientIds !== undefined) {
      const validRecipients = await this.validateAndFilterRecipients(userId, data.recipientIds);
      recipientIdsToSet = validRecipients.map((u) => u.id);

      // Check recipient count limit
      const recipientLimitCheck = await AuthorizationService.evaluateUserLimit(
        userId,
        'BROADCAST.MAX_RECIPIENTS_PER_LIST',
        recipientIdsToSet.length
      );

      if (recipientLimitCheck.isEnforced && recipientIdsToSet.length > recipientLimitCheck.max) {
        throw new Error(`Maximum recipient limit exceeded per broadcast list (${recipientIdsToSet.length}/${recipientLimitCheck.max}).`);
      }
    }

    // Perform DB update
    if (recipientIdsToSet !== undefined) {
      // Remove existing recipients and set new set
      await prisma.broadcastRecipient.deleteMany({
        where: { broadcastListId: listId },
      });

      await prisma.broadcastRecipient.createMany({
        data: recipientIdsToSet.map((rId) => ({
          broadcastListId: listId,
          userId: rId,
        })),
      });
    }

    const updated = await prisma.broadcastList.update({
      where: { id: listId },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
      },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
                business: { select: { shopName: true, assignedRole: true } },
              },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      recipientCount: updated.recipients.length,
      recipients: updated.recipients.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        mobileNumber: r.user.mobileNumber,
        shopName: r.user.business?.shopName || 'Shop Account',
        assignedRole: r.user.business?.assignedRole || 'RETAILER',
        isVerified: r.user.isVerified,
      })),
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Add recipients to an existing Broadcast List
   */
  static async addRecipients(userId: string, listId: string, recipientIdsToAdd: string[]) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
      include: { recipients: true },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== userId) throw new Error('UNAUTHORIZED: Access denied.');

    const currentRecipientIds = list.recipients.map((r) => r.userId);
    const combinedIds = Array.from(new Set([...currentRecipientIds, ...(recipientIdsToAdd || [])]));

    return this.updateBroadcastList(userId, listId, { recipientIds: combinedIds });
  }

  /**
   * Remove recipients from an existing Broadcast List
   */
  static async removeRecipients(userId: string, listId: string, recipientIdsToRemove: string[]) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
      include: { recipients: true },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== userId) throw new Error('UNAUTHORIZED: Access denied.');

    const toRemoveSet = new Set(recipientIdsToRemove || []);
    const remainingIds = list.recipients.map((r) => r.userId).filter((id) => !toRemoveSet.has(id));

    return this.updateBroadcastList(userId, listId, { recipientIds: remainingIds });
  }

  /**
   * Duplicate a Broadcast List
   */
  static async duplicateBroadcastList(userId: string, listId: string) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
      include: { recipients: true },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== userId) throw new Error('UNAUTHORIZED: Access denied.');

    const recipientIds = list.recipients.map((r) => r.userId);
    const copyTitle = `${list.title} (Copy)`;

    return this.createBroadcastList(userId, {
      title: copyTitle,
      description: list.description || undefined,
      recipientIds,
    });
  }

  /**
   * Delete a Broadcast List
   */
  static async deleteBroadcastList(userId: string, listId: string) {
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== userId) throw new Error('UNAUTHORIZED: Access denied.');

    // Feature Check
    const featureCheck = await AuthorizationService.checkUserPermission(
      userId,
      'BROADCAST.DELETE',
      'BROADCAST'
    );
    if (!featureCheck.allowed) {
      throw new Error(featureCheck.reason || 'Broadcast list deletion is disabled.');
    }

    await prisma.broadcastList.delete({
      where: { id: listId },
    });

    return { message: 'Broadcast list deleted successfully.' };
  }

  /**
   * WhatsApp-Style Broadcast Sending Engine:
   * 1. Validates sender and content flags & limits
   * 2. De-duplicates recipients
   * 3. Creates BroadcastMessage & BroadcastDelivery tracking records
   * 4. Dispatches background 1-to-1 message creation to EVERY recipient asynchronously
   * 5. Recipients receive normal 1-to-1 conversation messages (privacy fully preserved)
   */
  static async sendBroadcastMessage(
    senderId: string,
    listId: string,
    payload: SendBroadcastInput,
    ioServer?: any
  ) {
    const { text, productCode, mediaUrl, mediaType = 'TEXT', clientMessageId } = payload;

    if (!text?.trim() && !productCode?.trim() && !mediaUrl?.trim()) {
      throw new Error('Broadcast message cannot be empty.');
    }

    // 1. Fetch Broadcast List & Recipients
    const list = await prisma.broadcastList.findUnique({
      where: { id: listId },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                status: true,
                business: { select: { allowedCommunities: true, assignedRole: true } },
              },
            },
          },
        },
      },
    });

    if (!list) throw new Error('Broadcast list not found.');
    if (list.creatorId !== senderId) throw new Error('UNAUTHORIZED: You can only send to your own broadcast lists.');

    if (list.recipients.length === 0) {
      throw new Error('Broadcast list has no recipients. Add contacts to send a broadcast message.');
    }

    // 2. Check General Broadcast Permission Flag
    const mainFeatureCheck = await AuthorizationService.checkUserPermission(
      senderId,
      'BROADCAST.SEND',
      'BROADCAST'
    );
    if (!mainFeatureCheck.allowed) {
      throw new Error(mainFeatureCheck.reason || 'Broadcast messaging is disabled or restricted.');
    }

    // 3. Check Dynamic Content Sub-Flags based on mediaType
    const mediaTypeUpper = (mediaType || 'TEXT').toUpperCase();
    let contentPermissionKey = 'BROADCAST.TEXT';
    if (mediaTypeUpper.includes('IMAGE')) contentPermissionKey = 'BROADCAST.IMAGE';
    else if (mediaTypeUpper.includes('VIDEO')) contentPermissionKey = 'BROADCAST.VIDEO';
    else if (mediaTypeUpper.includes('DOCUMENT') || mediaTypeUpper.includes('PDF')) contentPermissionKey = 'BROADCAST.DOCUMENT';
    else if (mediaTypeUpper.includes('AUDIO')) contentPermissionKey = 'BROADCAST.AUDIO';
    else if (mediaTypeUpper.includes('VOICE')) contentPermissionKey = 'BROADCAST.VOICE';
    else if (mediaTypeUpper.includes('PRODUCT') || productCode) contentPermissionKey = 'BROADCAST.PRODUCT';
    else if (mediaTypeUpper.includes('POST')) contentPermissionKey = 'BROADCAST.POST';

    const subFlagCheck = await AuthorizationService.checkUserPermission(
      senderId,
      contentPermissionKey,
      'BROADCAST'
    );
    if (!subFlagCheck.allowed) {
      throw new Error(`Sending ${mediaTypeUpper} attachments via Broadcast is currently disabled by Admin.`);
    }

    // 4. Check Daily & Monthly Broadcast Limits
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayBroadcastsCount, monthBroadcastsCount, todayRecipientsCount] = await Promise.all([
      prisma.broadcastMessage.count({
        where: { senderId, createdAt: { gte: startOfToday } },
      }),
      prisma.broadcastMessage.count({
        where: { senderId, createdAt: { gte: startOfMonth } },
      }),
      prisma.broadcastDelivery.count({
        where: {
          broadcastMessage: { senderId },
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    // Check Daily Broadcast Limit
    const dailyBroadcastLimit = await AuthorizationService.evaluateUserLimit(
      senderId,
      'BROADCAST.MAX_BROADCASTS_PER_DAY',
      todayBroadcastsCount
    );
    if (dailyBroadcastLimit.isEnforced && !dailyBroadcastLimit.isAllowed) {
      throw new Error(`Daily broadcast count limit reached (${todayBroadcastsCount}/${dailyBroadcastLimit.max}). Please try again tomorrow.`);
    }

    // Check Monthly Broadcast Limit
    const monthBroadcastLimit = await AuthorizationService.evaluateUserLimit(
      senderId,
      'BROADCAST.MAX_BROADCASTS_PER_MONTH',
      monthBroadcastsCount
    );
    if (monthBroadcastLimit.isEnforced && !monthBroadcastLimit.isAllowed) {
      throw new Error(`Monthly broadcast limit reached (${monthBroadcastsCount}/${monthBroadcastLimit.max}).`);
    }

    // Check Daily Recipients Limit
    const recipientIds = Array.from(new Set(list.recipients.map((r) => r.userId)));
    const dailyRecipientsLimit = await AuthorizationService.evaluateUserLimit(
      senderId,
      'BROADCAST.MAX_RECIPIENTS_PER_DAY',
      todayRecipientsCount + recipientIds.length
    );
    if (dailyRecipientsLimit.isEnforced && todayRecipientsCount + recipientIds.length > dailyRecipientsLimit.max) {
      throw new Error(`Daily broadcast recipient quota exceeded (${todayRecipientsCount + recipientIds.length}/${dailyRecipientsLimit.max}).`);
    }

    // 5. Create BroadcastMessage and BroadcastDelivery records
    const broadcastMessage = await prisma.broadcastMessage.create({
      data: {
        broadcastListId: listId,
        senderId,
        text: text?.trim() || null,
        productCode: productCode?.trim() || null,
        mediaUrl: mediaUrl?.trim() || null,
        mediaType: mediaTypeUpper,
        totalRecipients: recipientIds.length,
        pendingCount: recipientIds.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        status: 'SENDING',
        deliveries: {
          create: recipientIds.map((rId) => ({
            recipientId: rId,
            status: 'PENDING',
          })),
        },
      },
      include: {
        deliveries: true,
      },
    });

    // Touch Broadcast List updatedAt
    await prisma.broadcastList.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });

    // 6. Asynchronous Background Batch Delivery Execution
    // Processes 1-to-1 dispatch in chunks without blocking API response
    setImmediate(async () => {
      let sentCount = 0;
      let failedCount = 0;

      const itemsToDeliver: { text?: string; productCode?: string; mediaUrl?: string }[] = [];

      if (payload.attachments && payload.attachments.length > 0) {
        itemsToDeliver.push({
          text: text?.trim() || undefined,
          productCode: productCode?.trim() || undefined,
          mediaUrl: payload.attachments[0].url,
        });

        for (let a = 1; a < payload.attachments.length; a++) {
          itemsToDeliver.push({
            mediaUrl: payload.attachments[a].url,
          });
        }
      } else {
        itemsToDeliver.push({
          text: text?.trim() || undefined,
          productCode: productCode?.trim() || undefined,
          mediaUrl: mediaUrl?.trim() || undefined,
        });
      }

      for (let i = 0; i < broadcastMessage.deliveries.length; i++) {
        const delivery = broadcastMessage.deliveries[i];

        try {
          // Get or create 1-to-1 Conversation with recipient
          const conversationResult = await ChatService.getOrCreateConversation(senderId, delivery.recipientId);

          let firstCreatedMsg: any = null;

          // Deliver each content item / attachment to the recipient's 1-to-1 conversation
          for (let itemIdx = 0; itemIdx < itemsToDeliver.length; itemIdx++) {
            const itemData = itemsToDeliver[itemIdx];
            const messageData = {
              ...itemData,
              clientMessageId: clientMessageId ? `${clientMessageId}_${delivery.recipientId}_${itemIdx}` : undefined,
            };

            const createdMessage = await ChatService.sendMessage(
              senderId,
              conversationResult.conversationId,
              messageData
            );

            if (!firstCreatedMsg) firstCreatedMsg = createdMessage;

            // Real-time Socket Event Dispatch for Recipient 1-to-1 Chat
            if (ioServer) {
              ioServer.to(conversationResult.conversationId).emit('receive_message', {
                id: createdMessage.id,
                conversationId: conversationResult.conversationId,
                senderId,
                text: createdMessage.text,
                productCode: createdMessage.productCode,
                mediaUrl: createdMessage.mediaUrl,
                createdAt: createdMessage.createdAt,
              });

              // Also notify target user's personal room for notification badges
              ioServer.to(`user:${delivery.recipientId}`).emit('new_message_notification', {
                conversationId: conversationResult.conversationId,
                senderId,
                text: createdMessage.text || (createdMessage.mediaUrl ? 'Attachment received' : 'Received a new message'),
              });
            }
          }

          // Update Delivery record status
          await prisma.broadcastDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'SENT',
              conversationId: conversationResult.conversationId,
              messageId: firstCreatedMsg?.id,
              sentAt: new Date(),
            },
          });

          sentCount++;
        } catch (err: any) {
          failedCount++;
          await prisma.broadcastDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              errorReason: err.message || 'Delivery failed',
            },
          });
        }

        // Progress notification socket event to sender
        if (ioServer) {
          ioServer.to(`user:${senderId}`).emit('broadcast_progress', {
            broadcastMessageId: broadcastMessage.id,
            broadcastListId: listId,
            sentCount,
            failedCount,
            totalRecipients: recipientIds.length,
            pendingCount: recipientIds.length - (sentCount + failedCount),
            status: sentCount + failedCount === recipientIds.length ? 'COMPLETED' : 'SENDING',
          });
        }
      }

      // Update final BroadcastMessage stats in DB
      const finalStatus = failedCount === recipientIds.length ? 'FAILED' : failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
      await prisma.broadcastMessage.update({
        where: { id: broadcastMessage.id },
        data: {
          sentCount,
          failedCount,
          pendingCount: 0,
          status: finalStatus,
        },
      });
    });

    return {
      broadcastMessageId: broadcastMessage.id,
      broadcastListId: listId,
      totalRecipients: recipientIds.length,
      status: 'SENDING',
      message: `Broadcast message dispatch initiated to ${recipientIds.length} recipients.`,
    };
  }
}
