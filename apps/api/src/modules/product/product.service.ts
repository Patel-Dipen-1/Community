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

  // Get unified global categories and attributes (Defaults + Super Admin Approved Custom Choices - DELETED/REJECTED choices)
  static async getGlobalOptions() {
    const allDbOptions = await prisma.categoryAttributeRequest.findMany({
      select: { id: true, type: true, value: true, status: true },
    });

    const deletedValuesSet = new Set(
      allDbOptions.filter((r) => r.status === 'DELETED' || r.status === 'REJECTED').map((r) => r.value.trim().toLowerCase())
    );

    const approvedDbOptions = allDbOptions.filter((r) => r.status === 'APPROVED');

    const defaultClothingCategories = ['Ethnic & Kurtis', 'Western Wear', 'Sarees & Lehengas', "Men's Wear", 'Kidswear', 'Fabrics & Dress Materials', 'Innerwear & Sleepwear'];
    const defaultFabrics = ['100% Combed Cotton', 'Pure Silk', 'Denim', 'Rayon', 'Chiffon', 'Linen', 'Polyester Blend', 'Georgette', 'Velvet', 'Handloom Linen'];
    const defaultGenders = ['Women', 'Men', 'Unisex', 'Kids'];
    const defaultFitTypes = ['Regular Fit', 'Slim Fit', 'Oversized', 'Tailored Fit'];
    const defaultSeasons = ['Casual Wear', 'Festive / Wedding', 'Formal Workwear', 'Summer Collection', 'Winter Special'];
    const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size'];
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

    // Merge defaults + DB approved options, excluding any deleted/rejected values
    const mergeOptions = (defaults: string[], typeName: string) => {
      const dbValues = approvedDbOptions.filter((r) => r.type === typeName).map((r) => r.value);
      const combined = Array.from(new Set([...defaults, ...dbValues]));
      return combined.filter((v) => !deletedValuesSet.has(v.trim().toLowerCase()));
    };

    return {
      categories: mergeOptions(defaultClothingCategories, 'CATEGORY'),
      clothingCategories: mergeOptions(defaultClothingCategories, 'CATEGORY_CLOTHING'),
      hardwareCategories: mergeOptions(defaultHardwareCategories, 'CATEGORY_HARDWARE'),
      jewelleryCategories: mergeOptions(defaultJewelleryCategories, 'CATEGORY_JEWELLERY'),
      electronicsCategories: mergeOptions(defaultElectronicsCategories, 'CATEGORY_ELECTRONICS'),
      groceryCategories: mergeOptions(defaultGroceryCategories, 'CATEGORY_GROCERY'),
      fabrics: mergeOptions(defaultFabrics, 'FABRIC'),
      genders: mergeOptions(defaultGenders, 'GENDER'),
      fitTypes: mergeOptions(defaultFitTypes, 'FIT'),
      seasons: mergeOptions(defaultSeasons, 'SEASON'),
      sizes: mergeOptions(defaultSizes, 'SIZE'),
      patterns: mergeOptions(defaultPatterns, 'PATTERN'),
      hardwareMaterials: mergeOptions(defaultHardwareMaterials, 'HARDWARE_MATERIAL'),
      hardwareWarranties: mergeOptions(defaultHardwareWarranties, 'HARDWARE_WARRANTY'),
      hardwarePowerRatings: mergeOptions(defaultHardwarePowerRatings, 'HARDWARE_POWER'),
      hardwareFinishes: mergeOptions(defaultHardwareFinishes, 'HARDWARE_FINISH'),
      hardwareApplications: mergeOptions(defaultHardwareApplications, 'HARDWARE_APPLICATION'),
      jewelleryPurities: mergeOptions(defaultJewelleryPurities, 'JEWELLERY_PURITY'),
      jewelleryGemstones: mergeOptions(defaultJewelleryGemstones, 'JEWELLERY_GEMSTONE'),
      jewelleryCertifications: mergeOptions(defaultJewelleryCertifications, 'JEWELLERY_CERT'),
      electronicsPowerSources: mergeOptions(defaultElectronicsPowerSources, 'ELEC_POWER'),
      electronicsConnectivities: mergeOptions(defaultElectronicsConnectivities, 'ELEC_CONN'),
      electronicsWarranties: mergeOptions(defaultElectronicsWarranties, 'ELEC_WARRANTY'),
      groceryPackagings: mergeOptions(defaultGroceryPackagings, 'GROCERY_PACK'),
      groceryShelfLives: mergeOptions(defaultGroceryShelfLives, 'GROCERY_SHELF'),
      groceryCertifications: mergeOptions(defaultGroceryCertifications, 'GROCERY_CERT'),
    };
  }

  // Get full hierarchical dynamic schema (Community -> Category -> Specification -> Options)
  static async getDynamicSchema() {
    const globalOptions = await this.getGlobalOptions();
    const dbRequests = await prisma.categoryAttributeRequest.findMany({
      where: { status: 'APPROVED' },
    });

    const customTypesSet = new Set(dbRequests.map((r) => r.type));

    const communities = [
      {
        id: 'clothing',
        name: 'Clothing & Textiles Community',
        slug: 'clothing',
        icon: '👕',
        categories: (globalOptions.clothingCategories || []).map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        })),
        specifications: [
          { key: 'FABRIC', label: 'Fabric Type', inputType: 'SELECT', options: globalOptions.fabrics || [] },
          { key: 'SIZE', label: 'Sizes', inputType: 'MULTI_SELECT', options: globalOptions.sizes || [] },
          { key: 'FIT', label: 'Fit Type', inputType: 'SELECT', options: globalOptions.fitTypes || [] },
          { key: 'GENDER', label: 'Target Gender / Age', inputType: 'SELECT', options: globalOptions.genders || [] },
          { key: 'SEASON', label: 'Season / Occasion', inputType: 'SELECT', options: globalOptions.seasons || [] },
          { key: 'PATTERN', label: 'Patterns & Work', inputType: 'SELECT', options: globalOptions.patterns || [] },
        ],
      },
      {
        id: 'jewellery',
        name: 'Jewellery & Gems Community',
        slug: 'jewellery',
        icon: '💎',
        categories: (globalOptions.jewelleryCategories || []).map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        })),
        specifications: [
          { key: 'JEWELLERY_PURITY', label: 'Gold / Metal Purity', inputType: 'SELECT', options: globalOptions.jewelleryPurities || [] },
          { key: 'JEWELLERY_GEMSTONE', label: 'Gemstone Type', inputType: 'SELECT', options: globalOptions.jewelleryGemstones || [] },
          { key: 'JEWELLERY_CERT', label: 'Certifications', inputType: 'SELECT', options: globalOptions.jewelleryCertifications || [] },
        ],
      },
      {
        id: 'hardware',
        name: 'Hardware & Industrial Tools',
        slug: 'hardware',
        icon: '🔧',
        categories: (globalOptions.hardwareCategories || []).map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        })),
        specifications: [
          { key: 'HARDWARE_MATERIAL', label: 'Material Grade', inputType: 'SELECT', options: globalOptions.hardwareMaterials || [] },
          { key: 'HARDWARE_WARRANTY', label: 'Warranty Period', inputType: 'SELECT', options: globalOptions.hardwareWarranties || [] },
          { key: 'HARDWARE_POWER', label: 'Power Rating', inputType: 'SELECT', options: globalOptions.hardwarePowerRatings || [] },
          { key: 'HARDWARE_FINISH', label: 'Surface Finish', inputType: 'SELECT', options: globalOptions.hardwareFinishes || [] },
          { key: 'HARDWARE_APPLICATION', label: 'Application', inputType: 'SELECT', options: globalOptions.hardwareApplications || [] },
        ],
      },
      {
        id: 'electronics',
        name: 'Electronics & Electricals',
        slug: 'electronics',
        icon: '⚡',
        categories: (globalOptions.electronicsCategories || []).map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        })),
        specifications: [
          { key: 'ELEC_POWER', label: 'Power Source', inputType: 'SELECT', options: globalOptions.electronicsPowerSources || [] },
          { key: 'ELEC_CONN', label: 'Connectivity Type', inputType: 'SELECT', options: globalOptions.electronicsConnectivities || [] },
          { key: 'ELEC_WARRANTY', label: 'Warranty Period', inputType: 'SELECT', options: globalOptions.electronicsWarranties || [] },
        ],
      },
      {
        id: 'grocery',
        name: 'Grocery & FMCG Staples',
        slug: 'grocery',
        icon: '🌾',
        categories: (globalOptions.groceryCategories || []).map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        })),
        specifications: [
          { key: 'GROCERY_PACK', label: 'Packaging Type', inputType: 'SELECT', options: globalOptions.groceryPackagings || [] },
          { key: 'GROCERY_SHELF', label: 'Shelf Life', inputType: 'SELECT', options: globalOptions.groceryShelfLives || [] },
          { key: 'GROCERY_CERT', label: 'Certification', inputType: 'SELECT', options: globalOptions.groceryCertifications || [] },
        ],
      },
    ];

    const standardKeys = new Set([
      'FABRIC', 'SIZE', 'FIT', 'GENDER', 'SEASON', 'PATTERN',
      'JEWELLERY_PURITY', 'JEWELLERY_GEMSTONE', 'JEWELLERY_CERT',
      'HARDWARE_MATERIAL', 'HARDWARE_WARRANTY', 'HARDWARE_POWER', 'HARDWARE_FINISH', 'HARDWARE_APPLICATION',
      'ELEC_POWER', 'ELEC_CONN', 'ELEC_WARRANTY',
      'GROCERY_PACK', 'GROCERY_SHELF', 'GROCERY_CERT',
      'CATEGORY', 'CATEGORY_CLOTHING', 'CATEGORY_HARDWARE', 'CATEGORY_JEWELLERY', 'CATEGORY_ELECTRONICS', 'CATEGORY_GROCERY'
    ]);

    customTypesSet.forEach((customType) => {
      if (!standardKeys.has(customType)) {
        const opts = dbRequests.filter((r) => r.type === customType).map((r) => r.value);
        if (opts.length > 0) {
          communities[0].specifications.push({
            key: customType,
            label: customType.replace(/_/g, ' '),
            inputType: 'SELECT',
            options: Array.from(new Set(opts)),
          });
        }
      }
    });

    return { communities, globalOptions };
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

  // Super Admin: Approve Category/Attribute request (with optional reclassification of type & value)
  static async approveCategoryAttributeRequest(requestId: string, newType?: string, newValue?: string) {
    const dataToUpdate: any = { status: 'APPROVED' };
    if (newType && newType.trim()) dataToUpdate.type = newType.trim().toUpperCase();
    if (newValue && newValue.trim()) dataToUpdate.value = newValue.trim();

    const updated = await prisma.categoryAttributeRequest.update({
      where: { id: requestId },
      data: dataToUpdate,
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

  // Super Admin: Delete / Remove Category or Attribute Option
  static async deleteCategoryAttributeRequest(requestIdOrValue: string) {
    // Check if UUID ID matches
    const existingById = await prisma.categoryAttributeRequest.findUnique({
      where: { id: requestIdOrValue },
    });

    if (existingById) {
      const updated = await prisma.categoryAttributeRequest.update({
        where: { id: requestIdOrValue },
        data: { status: 'DELETED' },
      });
      return updated;
    }

    // Check if value matches
    const existingByValue = await prisma.categoryAttributeRequest.findFirst({
      where: { value: { equals: requestIdOrValue, mode: 'insensitive' } },
    });

    if (existingByValue) {
      const updated = await prisma.categoryAttributeRequest.update({
        where: { id: existingByValue.id },
        data: { status: 'DELETED' },
      });
      return updated;
    }

    // Default option not yet in DB -> Insert as DELETED so getGlobalOptions excludes it
    const adminUser = await prisma.user.findFirst();

    const deleted = await prisma.categoryAttributeRequest.create({
      data: {
        userId: adminUser?.id || 'system-admin',
        type: 'ATTRIBUTE',
        value: requestIdOrValue,
        description: 'Option deleted by Super Admin',
        status: 'DELETED',
      },
    });

    return deleted;
  }

  // Super Admin: Create new category/attribute option directly
  static async createAdminCategoryAttributeOption(userId: string, type: string, value: string, description?: string) {
    const existing = await prisma.categoryAttributeRequest.findFirst({
      where: { type, value: { equals: value.trim(), mode: 'insensitive' } },
    });

    if (existing) {
      return await prisma.categoryAttributeRequest.update({
        where: { id: existing.id },
        data: { status: 'APPROVED', value: value.trim(), description: description || null },
      });
    }

    return await prisma.categoryAttributeRequest.create({
      data: {
        userId,
        type: type.trim().toUpperCase(),
        value: value.trim(),
        description: description || null,
        status: 'APPROVED',
      },
    });
  }

  // Super Admin: Update existing category/attribute option value & type
  static async updateCategoryAttributeOption(idOrOldValue: string, newValue: string, newType?: string) {
    const existing = await prisma.categoryAttributeRequest.findFirst({
      where: {
        OR: [{ id: idOrOldValue }, { value: { equals: idOrOldValue.trim(), mode: 'insensitive' } }],
      },
    });

    if (existing) {
      const dataToUpdate: any = { value: newValue.trim(), status: 'APPROVED' };
      if (newType && newType.trim()) dataToUpdate.type = newType.trim().toUpperCase();

      return await prisma.categoryAttributeRequest.update({
        where: { id: existing.id },
        data: dataToUpdate,
      });
    }

    const adminUser = await prisma.user.findFirst();

    // Soft delete old default value
    await prisma.categoryAttributeRequest.create({
      data: {
        userId: adminUser?.id || 'system-admin',
        type: newType ? newType.trim().toUpperCase() : 'ATTRIBUTE',
        value: idOrOldValue.trim(),
        status: 'DELETED',
      },
    });

    // Create new approved replacement
    return await prisma.categoryAttributeRequest.create({
      data: {
        userId: adminUser?.id || 'system-admin',
        type: newType ? newType.trim().toUpperCase() : 'ATTRIBUTE',
        value: newValue.trim(),
        status: 'APPROVED',
      },
    });
  }
}
