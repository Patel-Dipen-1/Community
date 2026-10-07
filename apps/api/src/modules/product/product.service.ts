import { prisma } from '@b2b/database';

export class ProductService {
  // Helper to ensure a community exists for product relation
  private static async getOrCreateCommunity(communityIdOrSlug: string) {
    const slug = communityIdOrSlug.toLowerCase().includes('jewel') ? 'jewellery' : 'clothing';
    let community = await prisma.community.findFirst({
      where: {
        OR: [{ id: communityIdOrSlug }, { slug }],
      },
    });

    if (!community) {
      community = await prisma.community.create({
        data: {
          slug,
          name: slug === 'clothing' ? 'Clothing & Textiles' : 'Jewellery & Gems',
          description: `Verified B2B Community for ${slug}`,
        },
      });
    }

    return community;
  }

  // Helper to ensure a category exists for product relation
  private static async getOrCreateCategory(communityId: string, categoryIdOrSlug: string) {
    let category = await prisma.category.findFirst({
      where: {
        OR: [{ id: categoryIdOrSlug }, { slug: categoryIdOrSlug }],
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          communityId,
          slug: categoryIdOrSlug.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: categoryIdOrSlug,
          specFields: {},
        },
      });
    }

    return category;
  }

  // CREATE PRODUCT IN POSTGRESQL DB (STRICTLY RESTRICTED TO APPROVED USERS)
  static async createProduct(userId: string, data: any) {
    // 1. Fetch User and Business details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    // 2. ONLY APPROVED USERS CAN CREATE PRODUCTS
    const isApproved = user.isVerified || user.status === 'APPROVED';
    if (!isApproved) {
      throw new Error(
        `UNAPPROVED_USER: Only Super Admin approved vendors can create products. Your account verification status is currently '${user.status}'. Please wait for Super Admin approval.`
      );
    }

    if (!user.business) {
      throw new Error('Business profile required to create products. Please complete business setup.');
    }

    const existingCode = await prisma.product.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new Error(`Product Code SKU '${data.code}' already exists. Please choose a unique SKU.`);
    }

    const community = await this.getOrCreateCommunity(data.communityId || 'clothing');
    const category = await this.getOrCreateCategory(community.id, data.categoryId || 'clothing-wear');

    const product = await prisma.product.create({
      data: {
        code: data.code,
        businessId: user.business.id,
        communityId: community.id,
        categoryId: category.id,
        title: data.title,
        description: data.description,
        moq: data.moq || 1,
        priceTiers: data.priceTiers || [],
        images: data.images || [],
        videoUrl: data.videoUrl || null,
        specs: data.specs || {},
        isHotSelling: Boolean(data.isHotSelling),
      },
      include: {
        business: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
              },
            },
            media: true,
          },
        },
        community: true,
        category: true,
      },
    });

    return product;
  }

  // READ SINGLE PRODUCT BY ID OR SKU CODE WITH USER PROFILE & SHOP MEDIA
  static async getProduct(idOrCode: string, requesterUserId?: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        business: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
              },
            },
            media: true,
          },
        },
        community: true,
        category: true,
      },
    });

    if (!product) return null;

    if (requesterUserId) {
      const requester = await prisma.user.findUnique({
        where: { id: requesterUserId },
        include: { business: true },
      });

      if (requester) {
        const isOwner = product.business.userId === requesterUserId;
        const isSuperAdmin = requester.business?.assignedRole === 'SUPER_ADMIN';

        if (!isOwner && !isSuperAdmin) {
          const requesterComms = requester.business?.allowedCommunities || ['clothing'];
          const ownerComms = product.business.allowedCommunities || ['clothing'];

          const hasAccess = requesterComms.some((c) => ownerComms.includes(c));
          if (!hasAccess) {
            throw new Error('COMMUNITY_RESTRICTED: Product access is restricted to allowed trade communities.');
          }

          if (!product.isActive) {
            throw new Error('PRODUCT_INACTIVE: Product listing is currently inactive.');
          }
        }
      }
    }

    return product;
  }

  // UPDATE PRODUCT (ONLY FOR APPROVED BUSINESS OWNER)
  static async updateProduct(productId: string, userId: string, updateData: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user || (!user.isVerified && user.status !== 'APPROVED')) {
      throw new Error('Only approved users can update products.');
    }

    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId: user.business?.id },
    });

    if (!existing) {
      throw new Error('Product not found or unauthorized to update.');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        title: updateData.title ?? existing.title,
        description: updateData.description ?? existing.description,
        moq: updateData.moq ?? existing.moq,
        priceTiers: updateData.priceTiers ?? existing.priceTiers,
        images: updateData.images ?? existing.images,
        videoUrl: updateData.videoUrl ?? existing.videoUrl,
        specs: updateData.specs ?? existing.specs,
        isHotSelling: updateData.isHotSelling !== undefined ? Boolean(updateData.isHotSelling) : existing.isHotSelling,
      },
      include: {
        business: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
              },
            },
            media: true,
          },
        },
        community: true,
        category: true,
      },
    });

    return updated;
  }

  // DELETE PRODUCT
  static async deleteProduct(productId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user || !user.business) return false;

    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId: user.business.id },
    });

    if (!existing) return false;

    await prisma.product.delete({
      where: { id: productId },
    });

    return true;
  }

  // TOGGLE PRODUCT ACTIVE / INACTIVE STATUS (OWNER ONLY)
  static async toggleProductStatus(productId: string, userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user || !user.business) {
      throw new Error('Business profile required to update product status.');
    }

    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId: user.business.id },
    });

    if (!existing) {
      throw new Error('Product not found or unauthorized to update status.');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isActive: Boolean(isActive) },
    });

    return updated;
  }

  // SEARCH / LIST PRODUCTS WITH FILTERS (STRICT COMMUNITY ISOLATION & ACTIVE STATUS)
  static async searchProducts(
    requesterUserId?: string,
    params?: {
      communityId?: string;
      query?: string;
      isHotSelling?: boolean;
      businessId?: string;
    }
  ) {
    const { query, isHotSelling, businessId } = params || {};

    let allowedCommunities: string[] = ['clothing'];
    let isSuperAdmin = false;
    let isOwnerOfTargetBusiness = false;

    if (requesterUserId) {
      const requester = await prisma.user.findUnique({
        where: { id: requesterUserId },
        include: { business: true },
      });
      if (requester?.business) {
        allowedCommunities = requester.business.allowedCommunities || ['clothing'];
        isSuperAdmin = requester.business.assignedRole === 'SUPER_ADMIN';
        if (businessId && requester.business.id === businessId) {
          isOwnerOfTargetBusiness = true;
        }
      }
    }

    const shouldFilterActiveOnly = !isSuperAdmin && !isOwnerOfTargetBusiness;

    const products = await prisma.product.findMany({
      where: {
        ...(shouldFilterActiveOnly ? { isActive: true } : {}),
        business: {
          user: { status: 'APPROVED' },
          ...(!isSuperAdmin && requesterUserId
            ? {
                allowedCommunities: {
                  hasSome: allowedCommunities,
                },
              }
            : {}),
        },
        ...(isHotSelling ? { isHotSelling: true } : {}),
        ...(businessId ? { businessId } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { code: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        business: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobileNumber: true,
                status: true,
                isVerified: true,
              },
            },
            media: true,
          },
        },
        community: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  }

  // ============================================================
  // CUSTOM CATEGORY & ATTRIBUTE REQUEST ENGINE
  // ============================================================

  // User submits a request for a custom Category or Specification Attribute
  static async submitCategoryAttributeRequest(userId: string, data: { type: string; value: string; description?: string }) {
    if (!data.type || !data.value) {
      throw new Error('Request type (CATEGORY, FABRIC, GENDER, FIT, SEASON, SIZE, PATTERN) and value are required.');
    }

    const request = await prisma.categoryAttributeRequest.create({
      data: {
        userId,
        type: data.type.toUpperCase(),
        value: data.value.trim(),
        description: data.description?.trim() || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
            business: { select: { shopName: true } },
          },
        },
      },
    });

    return request;
  }

  // Get unified global categories and attributes (Defaults + Super Admin Approved Custom Choices)
  static async getGlobalOptions() {
    const approvedRequests = await prisma.categoryAttributeRequest.findMany({
      where: { status: 'APPROVED' },
      select: { type: true, value: true },
    });

    const defaultCategories = ['Ethnic & Kurtis', 'Western Wear', 'Sarees & Lehengas', "Men's Wear", 'Kidswear', 'Fabrics & Dress Materials', 'Innerwear & Sleepwear'];
    const defaultFabrics = ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen', 'Polyester Blend', 'Georgette', 'Velvet', 'Handloom Linen'];
    const defaultGenders = ['Women', 'Men', 'Unisex', 'Kids'];
    const defaultFitTypes = ['Regular Fit', 'Slim Fit', 'Oversized', 'Tailored Fit'];
    const defaultSeasons = ['Casual Wear', 'Festive / Wedding', 'Formal Workwear', 'Summer Collection', 'Winter Special'];
    const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
    const defaultPatterns = ['Plain Solid', 'Digital Printed', 'Heavy Embroidery', 'Zari Work', 'Hand Block Printed', 'Chikan Work'];

    // Hardware Options
    const defaultHardwareCategories = ['Power Tools', 'Hand Tools', 'Fasteners & Bolts', 'Plumbing & Pipes', 'Paints & Chemicals', 'Safety Equipment', 'Machine Parts'];
    const defaultHardwareMaterials = ['Stainless Steel 304', 'High Carbon Steel', 'Brass', 'Cast Iron', 'Heavy Duty Alloy', 'Chrome Vanadium', 'PVC / Polymer'];
    const defaultHardwareWarranties = ['No Warranty', '6 Months Brand Warranty', '1 Year Manufacturer Warranty', '2 Years Replacement Guarantee', 'Lifetime Guarantee'];
    const defaultHardwarePowerRatings = ['Manual / Non-Powered', '220V AC Heavy Duty', '12V Cordless Battery', '18V Brushless Lithium', '440V 3-Phase Industrial'];
    const defaultHardwareFinishes = ['Rust-Proof Zinc Coated', 'Chrome Plated', 'Matte Black Powder Coated', 'Anodized Aluminum', 'Polished Mirror Finish'];
    const defaultHardwareApplications = ['Heavy Construction', 'Workshop & Fabrication', 'Automobile Repair', 'Home DIY & Repairs', 'Electrical Installation'];

    // Jewellery Options
    const defaultJewelleryCategories = ['Gold Jewellery', 'Diamond Jewellery', '1 Gram Gold / Imitation', 'Sterling Silver 925', 'Gemstones & Pearls', 'Bridal Sets'];
    const defaultJewelleryPurities = ['24K Pure Gold (999)', '22K BIS Hallmarked (916)', '18K Diamond Gold (750)', '14K Gold', '1 Gram Micro Plated', '925 Sterling Silver'];
    const defaultJewelleryGemstones = ['Uncut Polki Diamond', 'Real Solitaire Diamond', 'Certified Emerald', 'Cubic Zirconia (CZ)', 'Fresh Water Pearl', 'Synthetic Ruby'];
    const defaultJewelleryCertifications = ['BIS Hallmarked', 'IGI Certified Diamond', 'GIA Certified Solitaire', 'SGL Certified', 'Non-Certified Commercial'];

    // Electronics Options
    const defaultElectronicsCategories = ['Smartphones & Accessories', 'Audio & Speakers', 'Cables & Chargers', 'Home Appliances', 'Circuit Boards & Sensors', 'LED Lighting'];
    const defaultElectronicsPowerSources = ['Battery Operated', '220V Mains Power', 'USB-C 5V', 'Solar Powered', '12V DC Input'];
    const defaultElectronicsConnectivities = ['Bluetooth 5.3', 'Wi-Fi 6', 'Wired USB-C', 'RF Remote Control', 'Zigbee / Smart Home'];
    const defaultElectronicsWarranties = ['6 Months Repair', '1 Year Brand Warranty', '2 Years Extended Warranty'];

    // Grocery Options
    const defaultGroceryCategories = ['Spices & Masala', 'Grains & Pulses', 'Edible Oils', 'Dry Fruits & Nuts', 'Packaged Snacks', 'Organic Staples'];
    const defaultGroceryPackagings = ['Standard Pouch', 'Vacuum Sealed Pack', 'Tin Can', 'Jute Sack', 'Glass Jar', 'Plastic Container'];
    const defaultGroceryShelfLives = ['3 Months', '6 Months', '12 Months', '24 Months'];
    const defaultGroceryCertifications = ['FSSAI Licensed & Certified', '100% Organic Certified', 'ISO Standard', 'Non-GMO Certified'];

    const customCategories = approvedRequests.filter((r) => r.type === 'CATEGORY').map((r) => r.value);
    const customFabrics = approvedRequests.filter((r) => r.type === 'FABRIC').map((r) => r.value);
    const customGenders = approvedRequests.filter((r) => r.type === 'GENDER').map((r) => r.value);
    const customFits = approvedRequests.filter((r) => r.type === 'FIT').map((r) => r.value);
    const customSeasons = approvedRequests.filter((r) => r.type === 'SEASON').map((r) => r.value);
    const customSizes = approvedRequests.filter((r) => r.type === 'SIZE').map((r) => r.value);
    const customPatterns = approvedRequests.filter((r) => r.type === 'PATTERN').map((r) => r.value);

    const categories = Array.from(new Set([...defaultCategories, ...customCategories]));
    const fabrics = Array.from(new Set([...defaultFabrics, ...customFabrics]));
    const genders = Array.from(new Set([...defaultGenders, ...customGenders]));
    const fitTypes = Array.from(new Set([...defaultFitTypes, ...customFits]));
    const seasons = Array.from(new Set([...defaultSeasons, ...customSeasons]));
    const sizes = Array.from(new Set([...defaultSizes, ...customSizes]));
    const patterns = Array.from(new Set([...defaultPatterns, ...customPatterns]));

    return {
      categories,
      clothingCategories: categories,
      hardwareCategories: defaultHardwareCategories,
      jewelleryCategories: defaultJewelleryCategories,
      electronicsCategories: defaultElectronicsCategories,
      groceryCategories: defaultGroceryCategories,
      fabrics,
      genders,
      fitTypes,
      seasons,
      sizes,
      patterns,
      hardwareMaterials: defaultHardwareMaterials,
      hardwareWarranties: defaultHardwareWarranties,
      hardwarePowerRatings: defaultHardwarePowerRatings,
      hardwareFinishes: defaultHardwareFinishes,
      hardwareApplications: defaultHardwareApplications,
      jewelleryPurities: defaultJewelleryPurities,
      jewelleryGemstones: defaultJewelleryGemstones,
      jewelleryCertifications: defaultJewelleryCertifications,
      electronicsPowerSources: defaultElectronicsPowerSources,
      electronicsConnectivities: defaultElectronicsConnectivities,
      electronicsWarranties: defaultElectronicsWarranties,
      groceryPackagings: defaultGroceryPackagings,
      groceryShelfLives: defaultGroceryShelfLives,
      groceryCertifications: defaultGroceryCertifications,
    };
  }

  // Super Admin: List all category & attribute requests
  static async getCategoryAttributeRequests(statusFilter?: string) {
    const requests = await prisma.categoryAttributeRequest.findMany({
      where: statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {},
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
            status: true,
            business: { select: { shopName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  // Super Admin: Approve Category/Attribute request
  static async approveCategoryAttributeRequest(requestId: string) {
    const updated = await prisma.categoryAttributeRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
            business: { select: { shopName: true } },
          },
        },
      },
    });

    return updated;
  }

  // Super Admin: Reject Category/Attribute request
  static async rejectCategoryAttributeRequest(requestId: string, reason?: string) {
    const updated = await prisma.categoryAttributeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Request rejected by Super Admin',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
            business: { select: { shopName: true } },
          },
        },
      },
    });

    return updated;
  }
}
