import { prisma } from '@b2b/database';

export class StoreService {
  /**
   * Helper to format a clean URL slug from shop name
   */
  private static generateSlug(name: string, fallbackId: string): string {
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return clean.length >= 3 ? clean : `store-${fallbackId.slice(0, 8)}`;
  }

  /**
   * Fetch or auto-initialize Store for the authenticated business owner.
   */
  static async getOwnerStore(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: { include: { store: true, media: true } } },
    });

    if (!user || !user.business) {
      throw new Error('Business profile required to access Store settings.');
    }

    let store = user.business.store;

    // Auto-create initial Store profile if missing
    if (!store) {
      const initialSlug = this.generateSlug(user.business.shopName, user.business.id);
      
      // Ensure unique slug
      let uniqueSlug = initialSlug;
      let counter = 1;
      while (await prisma.store.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${initialSlug}-${counter++}`;
      }

      store = await prisma.store.create({
        data: {
          businessId: user.business.id,
          name: user.business.shopName,
          slug: uniqueSlug,
          bio: `Welcome to ${user.business.shopName} official trade catalog. Verified wholesale & manufacturing partner.`,
          isActive: true,
        },
      });
    }

    const productsCount = await prisma.product.count({
      where: { businessId: user.business.id },
    });

    const activeProductsCount = await prisma.product.count({
      where: { businessId: user.business.id, isActive: true },
    });

    const products = await prisma.product.findMany({
      where: { businessId: user.business.id },
      include: {
        category: true,
        community: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      store: {
        id: store.id,
        businessId: store.businessId,
        name: store.name,
        slug: store.slug,
        bio: store.bio,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        isActive: store.isActive,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
      business: {
        id: user.business.id,
        userId: user.id,
        shopName: user.business.shopName,
        assignedRole: user.business.assignedRole || 'RETAILER',
        allowedCommunities: user.business.allowedCommunities || ['clothing'],
        streetAddress: user.business.streetAddress,
        city: user.business.city,
        state: user.business.state,
        pincode: user.business.pincode,
        gstNumber: user.business.gstNumber,
        verificationTag: user.business.verificationTag,
        ownerName: user.fullName,
        mobileNumber: user.mobileNumber,
        status: user.status,
        media: user.business.media || [],
      },
      isOwner: true,
      products,
      stats: {
        totalProducts: productsCount,
        activeProducts: activeProductsCount,
      },
    };
  }

  /**
   * Update owner Store profile details (Logo, Banner, Name, Bio, Active status).
   */
  static async updateStore(
    userId: string,
    data: { name?: string; bio?: string; logoUrl?: string; bannerUrl?: string; isActive?: boolean }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: { include: { store: true } } },
    });

    if (!user || !user.business) {
      throw new Error('Business profile required to update Store.');
    }

    let store = user.business.store;
    if (!store) {
      await this.getOwnerStore(userId);
      const reloaded = await prisma.user.findUnique({
        where: { id: userId },
        include: { business: { include: { store: true } } },
      });
      store = reloaded?.business?.store || null;
    }

    if (!store) throw new Error('Failed to locate Store instance.');

    let newSlug = store.slug;
    if (data.name && data.name.trim() !== store.name) {
      const generated = this.generateSlug(data.name, user.business.id);
      let counter = 1;
      newSlug = generated;
      while (
        await prisma.store.findFirst({
          where: { slug: newSlug, id: { not: store.id } },
        })
      ) {
        newSlug = `${generated}-${counter++}`;
      }
    }

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.name && { slug: newSlug }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      },
    });

    return updatedStore;
  }

  /**
   * Get Public / Authorized Store details and active product catalog.
   * Enforces Authentication + APPROVED status + Community Isolation + Store visibility.
   */
  static async getPublicStore(storeIdOrSlugOrBusinessId: string, requesterUserId: string) {
    // 1. Verify Requester Account Status & Allowed Communities
    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { business: true },
    });

    if (!requester || requester.status !== 'APPROVED') {
      throw new Error('RESTRICTED_NOT_APPROVED: Your account must be APPROVED to view Store catalogs.');
    }

    // 2. Locate Target Store by ID, Slug, or Business ID
    let store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: storeIdOrSlugOrBusinessId },
          { slug: storeIdOrSlugOrBusinessId },
          { businessId: storeIdOrSlugOrBusinessId },
        ],
      },
      include: {
        business: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
              },
            },
            media: true,
          },
        },
      },
    });

    // Fallback: If store record not created yet, look up business directly
    if (!store) {
      const business = await prisma.business.findFirst({
        where: {
          OR: [{ id: storeIdOrSlugOrBusinessId }, { userId: storeIdOrSlugOrBusinessId }],
        },
      });

      if (business) {
        await this.getOwnerStore(business.userId);
        store = await prisma.store.findFirst({
          where: { businessId: business.id },
          include: {
            business: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    mobileNumber: true,
                    status: true,
                    isVerified: true,
                  },
                },
                media: true,
              },
            },
          },
        });
      }
    }

    if (!store) {
      throw new Error('Store not found.');
    }

    // 3. Verify Target Business Owner Status
    if (store.business.user.status !== 'APPROVED') {
      throw new Error('RESTRICTED_NOT_APPROVED: Store owner account is pending verification.');
    }

    const isOwner = store.business.userId === requesterUserId;
    const isSuperAdmin = requester.business?.assignedRole === 'SUPER_ADMIN';

    // 4. Verify Community Isolation
    if (!isOwner && !isSuperAdmin) {
      const requesterComms = requester.business?.allowedCommunities || ['clothing'];
      const ownerComms = store.business.allowedCommunities || ['clothing'];
      const hasSharedCommunity = requesterComms.some((comm) => ownerComms.includes(comm));

      if (!hasSharedCommunity) {
        throw new Error('COMMUNITY_RESTRICTED: Store catalog access is restricted to allowed trade communities.');
      }

      // Check Store active status for non-owner
      if (!store.isActive) {
        throw new Error('STORE_INACTIVE: This Store catalog is currently inactive.');
      }
    }

    // 5. Fetch Store Products (Active only for viewers, all products for owner)
    const products = await prisma.product.findMany({
      where: {
        businessId: store.businessId,
        ...(!isOwner ? { isActive: true } : {}),
      },
      include: {
        category: true,
        community: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalProductsCount = await prisma.product.count({
      where: { businessId: store.businessId },
    });
    const activeProductsCount = await prisma.product.count({
      where: { businessId: store.businessId, isActive: true },
    });

    return {
      store: {
        id: store.id,
        businessId: store.businessId,
        name: store.name,
        slug: store.slug,
        bio: store.bio,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        isActive: store.isActive,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
      business: {
        id: store.business.id,
        userId: store.business.userId,
        shopName: store.business.shopName,
        assignedRole: store.business.assignedRole || 'RETAILER',
        allowedCommunities: store.business.allowedCommunities || ['clothing'],
        streetAddress: store.business.streetAddress,
        city: store.business.city,
        state: store.business.state,
        pincode: store.business.pincode,
        gstNumber: store.business.gstNumber,
        verificationTag: store.business.verificationTag,
        ownerName: store.business.user.fullName,
        mobileNumber: store.business.user.mobileNumber,
        status: store.business.user.status,
        media: store.business.media || [],
      },
      isOwner,
      products,
      stats: {
        totalProducts: totalProductsCount,
        activeProducts: activeProductsCount,
      },
    };
  }
}
