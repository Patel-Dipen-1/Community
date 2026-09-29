import { prisma } from '@b2b/database';
import { getUserCategoryProfile, hasMatchingCategory } from '../../utils/categoryAccess';

export class CommentService {
  /**
   * Create a comment on a Post (Status) or Product.
   * Rule 6: Comments allowed ONLY for content user is permitted to see through Category Rules.
   */
  static async createComment(
    userId: string,
    data: { statusId?: string; productId?: string; text: string }
  ) {
    if (!data.text || !data.text.trim()) {
      throw new Error('Comment text cannot be empty.');
    }

    if (!data.statusId && !data.productId) {
      throw new Error('Either statusId or productId must be provided to add a comment.');
    }

    const userProfile = await getUserCategoryProfile(userId);
    if (!userProfile || (!userProfile.isApproved && !userProfile.isSuperAdmin)) {
      throw new Error('RESTRICTED_NOT_APPROVED: Only APPROVED user accounts can post comments.');
    }

    // 1. If commenting on a Post/Status
    if (data.statusId) {
      const status = await prisma.status.findUnique({
        where: { id: data.statusId },
        include: { business: true },
      });

      if (!status) {
        throw new Error('Post/Status not found.');
      }

      const isOwner = status.userId === userId;
      const canView = isOwner || hasMatchingCategory(
        userProfile.allowedCommunities,
        status.categories && status.categories.length > 0 ? status.categories : status.business.allowedCommunities,
        userProfile.isSuperAdmin
      );

      if (!canView) {
        throw new Error('COMMUNITY_RESTRICTED: You can only comment on posts that belong to your assigned trade categories.');
      }
    }

    // 2. If commenting on a Product
    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        include: { business: true, community: true },
      });

      if (!product) {
        throw new Error('Product not found.');
      }

      const isOwner = product.business.userId === userId;
      const prodComms = product.business.allowedCommunities || [product.community.slug];
      const canView = isOwner || hasMatchingCategory(
        userProfile.allowedCommunities,
        prodComms,
        userProfile.isSuperAdmin
      );

      if (!canView) {
        throw new Error('COMMUNITY_RESTRICTED: You can only comment on products that belong to your assigned trade categories.');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        statusId: data.statusId || null,
        productId: data.productId || null,
        text: data.text.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            business: { select: { shopName: true } },
          },
        },
      },
    });

    return comment;
  }

  /**
   * Fetch all comments for a Post or Product.
   * Enforces backend category visibility checks before returning comments.
   */
  static async getComments(userId: string, params: { statusId?: string; productId?: string }) {
    const userProfile = await getUserCategoryProfile(userId);

    if (params.statusId) {
      const status = await prisma.status.findUnique({
        where: { id: params.statusId },
        include: { business: true },
      });

      if (!status) throw new Error('Post/Status not found.');

      if (userProfile) {
        const isOwner = status.userId === userId;
        const canView = isOwner || hasMatchingCategory(
          userProfile.allowedCommunities,
          status.categories && status.categories.length > 0 ? status.categories : status.business.allowedCommunities,
          userProfile.isSuperAdmin
        );

        if (!canView) {
          throw new Error('COMMUNITY_RESTRICTED: You cannot view comments for posts outside your trade categories.');
        }
      }
    }

    if (params.productId) {
      const product = await prisma.product.findUnique({
        where: { id: params.productId },
        include: { business: true, community: true },
      });

      if (!product) throw new Error('Product not found.');

      if (userProfile) {
        const isOwner = product.business.userId === userId;
        const prodComms = product.business.allowedCommunities || [product.community.slug];
        const canView = isOwner || hasMatchingCategory(
          userProfile.allowedCommunities,
          prodComms,
          userProfile.isSuperAdmin
        );

        if (!canView) {
          throw new Error('COMMUNITY_RESTRICTED: You cannot view comments for products outside your trade categories.');
        }
      }
    }

    const comments = await prisma.comment.findMany({
      where: {
        ...(params.statusId ? { statusId: params.statusId } : {}),
        ...(params.productId ? { productId: params.productId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            business: { select: { shopName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  }

  /**
   * Delete a comment (Author or Super Admin).
   */
  static async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found.');

    const userProfile = await getUserCategoryProfile(userId);
    const isOwner = comment.userId === userId;
    const isSuperAdmin = userProfile?.isSuperAdmin || false;

    if (!isOwner && !isSuperAdmin) {
      throw new Error('UNAUTHORIZED: You can only delete your own comments.');
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return { message: 'Comment deleted successfully.', id: commentId };
  }
}
