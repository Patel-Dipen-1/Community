import { prisma } from '@b2b/database';
import { getUserCategoryProfile, hasMatchingCategory } from '../../utils/categoryAccess';

export class LikeService {
  /**
   * Toggle Like (Like / Unlike) on a Post (Status) or Product.
   * Rule 6: Likes allowed ONLY for content user is permitted to see through Category Rules.
   */
  static async toggleLike(
    userId: string,
    data: { statusId?: string; productId?: string }
  ) {
    if (!data.statusId && !data.productId) {
      throw new Error('Either statusId or productId must be provided to like content.');
    }

    const userProfile = await getUserCategoryProfile(userId);
    if (!userProfile || (!userProfile.isApproved && !userProfile.isSuperAdmin)) {
      throw new Error('RESTRICTED_NOT_APPROVED: Only APPROVED user accounts can like content.');
    }

    // 1. If liking a Post/Status
    if (data.statusId) {
      const status = await prisma.status.findUnique({
        where: { id: data.statusId },
        include: { business: true },
      });

      if (!status) throw new Error('Post/Status not found.');

      const isOwner = status.userId === userId;
      const canView = isOwner || hasMatchingCategory(
        userProfile.allowedCommunities,
        status.categories && status.categories.length > 0 ? status.categories : status.business.allowedCommunities,
        userProfile.isSuperAdmin
      );

      if (!canView) {
        throw new Error('COMMUNITY_RESTRICTED: You can only like posts that belong to your assigned trade categories.');
      }

      const existing = await prisma.like.findUnique({
        where: {
          userId_statusId: {
            userId,
            statusId: data.statusId,
          },
        },
      });

      if (existing) {
        await prisma.like.delete({ where: { id: existing.id } });
        const totalLikes = await prisma.like.count({ where: { statusId: data.statusId } });
        return { isLiked: false, totalLikes };
      } else {
        await prisma.like.create({
          data: { userId, statusId: data.statusId },
        });
        const totalLikes = await prisma.like.count({ where: { statusId: data.statusId } });
        return { isLiked: true, totalLikes };
      }
    }

    // 2. If liking a Product
    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        include: { business: true, community: true },
      });

      if (!product) throw new Error('Product not found.');

      const isOwner = product.business.userId === userId;
      const prodComms = product.business.allowedCommunities || [product.community.slug];
      const canView = isOwner || hasMatchingCategory(
        userProfile.allowedCommunities,
        prodComms,
        userProfile.isSuperAdmin
      );

      if (!canView) {
        throw new Error('COMMUNITY_RESTRICTED: You can only like products that belong to your assigned trade categories.');
      }

      const existing = await prisma.like.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: data.productId,
          },
        },
      });

      if (existing) {
        await prisma.like.delete({ where: { id: existing.id } });
        const totalLikes = await prisma.like.count({ where: { productId: data.productId } });
        return { isLiked: false, totalLikes };
      } else {
        await prisma.like.create({
          data: { userId, productId: data.productId },
        });
        const totalLikes = await prisma.like.count({ where: { productId: data.productId } });
        return { isLiked: true, totalLikes };
      }
    }

    throw new Error('Invalid like request.');
  }

  /**
   * Get Like status and total count for a Post or Product.
   */
  static async getLikes(userId: string, params: { statusId?: string; productId?: string }) {
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
          throw new Error('COMMUNITY_RESTRICTED: You cannot view likes for posts outside your trade categories.');
        }
      }

      const [totalLikes, userLike] = await Promise.all([
        prisma.like.count({ where: { statusId: params.statusId } }),
        prisma.like.findUnique({
          where: { userId_statusId: { userId, statusId: params.statusId } },
        }),
      ]);

      return { totalLikes, isLikedByMe: Boolean(userLike) };
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
          throw new Error('COMMUNITY_RESTRICTED: You cannot view likes for products outside your trade categories.');
        }
      }

      const [totalLikes, userLike] = await Promise.all([
        prisma.like.count({ where: { productId: params.productId } }),
        prisma.like.findUnique({
          where: { userId_productId: { userId, productId: params.productId } },
        }),
      ]);

      return { totalLikes, isLikedByMe: Boolean(userLike) };
    }

    throw new Error('Invalid request parameters.');
  }
}
