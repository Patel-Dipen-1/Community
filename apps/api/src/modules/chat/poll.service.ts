import { prisma } from '@b2b/database';

export class PollService {
  static async createPoll(
    creatorId: string,
    data: {
      question: string;
      options: string[];
      conversationId?: string;
      groupId?: string;
      allowMultiple?: boolean;
      expiresInHours?: number;
    }
  ) {
    if (!data.question || !data.options || data.options.length < 2) {
      throw new Error('POLL_INVALID: Poll question and at least 2 options are required');
    }

    if (!data.conversationId && !data.groupId) {
      throw new Error('POLL_INVALID: Either conversationId or groupId must be specified');
    }

    const expiresAt = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 3600 * 1000)
      : null;

    const poll = await prisma.poll.create({
      data: {
        creatorId,
        question: data.question,
        conversationId: data.conversationId,
        groupId: data.groupId,
        allowMultiple: data.allowMultiple ?? false,
        expiresAt,
        options: {
          create: data.options.map((optText) => ({ text: optText.trim() })),
        },
      },
      include: {
        options: {
          include: {
            votes: {
              select: { userId: true },
            },
          },
        },
      },
    });

    return poll;
  }

  static async votePoll(userId: string, pollId: string, optionId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) {
      throw new Error('POLL_NOT_FOUND: Poll does not exist');
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      throw new Error('POLL_EXPIRED: Voting is closed for this poll');
    }

    const optionExists = poll.options.some((o) => o.id === optionId);
    if (!optionExists) {
      throw new Error('OPTION_NOT_FOUND: Invalid option selected');
    }

    if (!poll.allowMultiple) {
      // Remove existing votes by user on this poll
      await prisma.pollVote.deleteMany({
        where: { pollId, userId },
      });
    }

    // Upsert vote
    await prisma.pollVote.upsert({
      where: {
        pollId_optionId_userId: { pollId, optionId, userId },
      },
      update: {},
      create: { pollId, optionId, userId },
    });

    // Return updated poll state
    return prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: {
              select: { userId: true },
            },
          },
        },
      },
    });
  }

  static async getPollDetails(pollId: string) {
    return prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: {
              select: { userId: true },
            },
          },
        },
      },
    });
  }

  static async toggleStarMessage(userId: string, messageId: string) {
    const existing = await prisma.starredMessage.findUnique({
      where: { userId_messageId: { userId, messageId } },
    });

    if (existing) {
      await prisma.starredMessage.delete({
        where: { id: existing.id },
      });
      return { isStarred: false };
    } else {
      await prisma.starredMessage.create({
        data: { userId, messageId },
      });
      return { isStarred: true };
    }
  }

  static async getStarredMessages(userId: string) {
    const starred = await prisma.starredMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return starred;
  }
}
