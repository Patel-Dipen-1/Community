import { prisma } from '@b2b/database';
import bcrypt from 'bcryptjs';
import { PaginationParams, buildPaginationMeta } from '../../utils/pagination';

export class AdminService {
  // Get users with database-level server-side pagination, filtering, searching, & sorting
  static async getAllUsers(params: PaginationParams) {
    const { page, limit, skip, search, role, status, startDate, endDate, sortKey, sortOrder } = params;

    const where: any = {};

    // 1. Server-side Search across fields
    if (search && search.length > 0) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
        { business: { shopName: { contains: search, mode: 'insensitive' } } },
        { business: { gstNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 2. Server-side Role filter
    if (role && role !== 'ALL') {
      where.business = {
        ...where.business,
        assignedRole: role as any,
      };
    }

    // 3. Server-side Status filter
    if (status && status !== 'ALL') {
      where.status = status as any;
    }

    // 4. Server-side Date range filter (createdAt)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    // 5. Server-side Dynamic Sorting
    let orderBy: any = { createdAt: sortOrder };
    if (sortKey) {
      if (['fullName', 'email', 'createdAt', 'status'].includes(sortKey)) {
        orderBy = { [sortKey]: sortOrder };
      } else if (['shopName', 'assignedRole'].includes(sortKey)) {
        orderBy = { business: { [sortKey]: sortOrder } };
      }
    }

    // Execute count and paginated query concurrently in DB layer
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          business: {
            include: {
              media: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      userId: u.id,
      fullName: u.fullName,
      ownerName: u.fullName,
      email: u.email,
      mobileNumber: u.mobileNumber,
      status: u.status,
      isVerified: u.isVerified,
      isDeletionRequested: u.isDeletionRequested,
      shopName: u.business?.shopName || 'N/A',
      gstNumber: u.business?.gstNumber || 'N/A',
      address: u.business
        ? `${u.business.streetAddress}, ${u.business.city}, ${u.business.state} - ${u.business.pincode}`
        : 'N/A',
      assignedRole: u.business?.assignedRole || (u.email === 'dnpatel2002@gmail.com' ? 'SUPER_ADMIN' : 'RETAILER'),
      allowedCommunities: u.business?.allowedCommunities || ['clothing'],
      shopPhotosAndVideos: u.business?.media || [],
      businessId: u.business?.id || null,
      createdAt: u.createdAt,
    }));

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      users: formattedUsers,
      data: formattedUsers,
      totalUsers: total,
      pagination,
    };
  }

  // Create a new User (and Business) directly from Super Admin Panel
  static async createUser(data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    password?: string;
    role?: string;
    status?: string;
    isVerified?: boolean;
    shopName?: string;
    gstNumber?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    allowedCommunities?: string[];
  }) {
    const {
      fullName,
      email,
      mobileNumber,
      password = 'Password123!',
      role = 'WHOLESALER',
      status = 'APPROVED',
      isVerified = true,
      shopName,
      gstNumber,
      streetAddress = 'Main Market Road',
      city = 'Surat',
      state = 'Gujarat',
      pincode = '395002',
      allowedCommunities = ['clothing'],
    } = data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobileNumber }],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or mobile number already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        mobileNumber,
        passwordHash,
        status: (status as any) || 'APPROVED',
        isVerified,
        business: shopName
          ? {
              create: {
                shopName,
                gstNumber: gstNumber || null,
                streetAddress,
                city,
                state,
                pincode,
                verificationTag: isVerified,
                assignedRole: role as any,
                allowedCommunities,
              },
            }
          : undefined,
      },
      include: { business: true },
    });

    return {
      userId: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.business?.assignedRole || role,
      message: `User '${fullName}' created successfully!`,
    };
  }

  // Update existing user details & roles from Super Admin Panel
  static async updateUser(userId: string, data: {
    fullName?: string;
    email?: string;
    mobileNumber?: string;
    status?: string;
    isVerified?: boolean;
    assignedRole?: string;
    shopName?: string;
    gstNumber?: string;
    allowedCommunities?: string[];
  }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Protection check for Super Admin email
    if (user.email === 'dnpatel2002@gmail.com' && data.assignedRole && data.assignedRole !== 'SUPER_ADMIN') {
      throw new Error('Cannot downgrade primary Super Admin role');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName ?? user.fullName,
        email: data.email ?? user.email,
        mobileNumber: data.mobileNumber ?? user.mobileNumber,
        status: data.status ? (data.status as any) : user.status,
        isVerified: data.isVerified !== undefined ? data.isVerified : user.isVerified,
        business: user.business
          ? {
              update: {
                shopName: data.shopName ?? user.business.shopName,
                gstNumber: data.gstNumber ?? user.business.gstNumber,
                assignedRole: data.assignedRole ? (data.assignedRole as any) : user.business.assignedRole,
                allowedCommunities: data.allowedCommunities ?? user.business.allowedCommunities,
                verificationTag: data.isVerified !== undefined ? data.isVerified : user.business.verificationTag,
              },
            }
          : data.shopName
          ? {
              create: {
                shopName: data.shopName,
                gstNumber: data.gstNumber || null,
                streetAddress: 'Main Market',
                city: 'City Center',
                state: 'State',
                pincode: '000000',
                assignedRole: (data.assignedRole as any) || 'WHOLESALER',
                allowedCommunities: data.allowedCommunities || ['clothing'],
                verificationTag: data.isVerified ?? true,
              },
            }
          : undefined,
      },
      include: { business: true },
    });

    return {
      userId: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      message: `User '${updatedUser.fullName}' updated successfully!`,
    };
  }

  // Fetch pending UNVERIFIED registrations with database pagination
  static async getVerificationQueue(params: PaginationParams) {
    const { page, limit, skip, search, startDate, endDate, sortKey, sortOrder } = params;

    const where: any = {
      status: 'UNVERIFIED',
      email: { not: 'dnpatel2002@gmail.com' },
    };

    if (search && search.length > 0) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
        { business: { shopName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    let orderBy: any = { createdAt: sortOrder };
    if (sortKey && ['fullName', 'email', 'createdAt'].includes(sortKey)) {
      orderBy = { [sortKey]: sortOrder };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          business: {
            include: {
              media: true,
            },
          },
        },
      }),
    ]);

    const formattedQueue = users.map((u) => ({
      userId: u.id,
      ownerName: u.fullName,
      email: u.email,
      mobileNumber: u.mobileNumber,
      shopName: u.business?.shopName || 'N/A',
      gstNumber: u.business?.gstNumber || 'N/A',
      address: u.business
        ? `${u.business.streetAddress}, ${u.business.city}, ${u.business.state} - ${u.business.pincode}`
        : 'N/A',
      shopPhotosAndVideos: u.business?.media || [],
      registeredAt: u.createdAt,
    }));

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      queue: formattedQueue,
      data: formattedQueue,
      totalPending: total,
      pagination,
    };
  }

  // Approve & Tag Verified in PostgreSQL DB
  static async approveVerification(userId: string, category: string, role: string) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'APPROVED',
        isVerified: true,
        business: {
          update: {
            verificationTag: true,
            assignedRole: (role?.toUpperCase() || 'WHOLESALER') as any,
          },
        },
      },
      include: { business: true },
    });

    return {
      userId: updatedUser.id,
      isVerified: updatedUser.isVerified,
      verificationTag: updatedUser.business?.verificationTag || true,
      assignedCategory: category,
      assignedRole: updatedUser.business?.assignedRole,
    };
  }

  // Reject Verification in PostgreSQL DB
  static async rejectVerification(userId: string) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
    });

    return { userId: updatedUser.id, status: 'REJECTED' };
  }

  // Fetch Active Device Sessions with database pagination
  static async getActiveSessions(params: PaginationParams) {
    const { page, limit, skip, search, startDate, endDate, sortKey, sortOrder } = params;

    const where: any = {
      status: 'ACTIVE',
      user: {
        email: { not: 'dnpatel2002@gmail.com' },
        NOT: {
          business: {
            assignedRole: 'SUPER_ADMIN',
          },
        },
      },
    };

    if (search && search.length > 0) {
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { business: { shopName: { contains: search, mode: 'insensitive' } } } },
        { ipAddress: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.lastActive = {};
      if (startDate) where.lastActive.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
        where.lastActive.lte = end;
      }
    }

    let orderBy: any = { lastActive: sortOrder };
    if (sortKey && ['lastActive', 'createdAt'].includes(sortKey)) {
      orderBy = { [sortKey]: sortOrder };
    }

    const [total, sessions] = await Promise.all([
      prisma.session.count({ where }),
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            include: { business: true },
          },
        },
      }),
    ]);

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      shopName: s.user.business?.shopName || 'Independent',
      ownerName: s.user.fullName,
      email: s.user.email,
      community: (s.user.business?.allowedCommunities || ['clothing'])[0] || 'clothing',
      platform: s.platform || 'WEB',
      ipAddress: s.ipAddress || '127.0.0.1',
      lastActive: s.lastActive,
      status: s.status,
    }));

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      sessions: formattedSessions,
      data: formattedSessions,
      totalActive: total,
      pagination,
    };
  }

  // Terminate Active Session in PostgreSQL DB
  static async terminateSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { business: true } } },
    });

    if (session && (session.user.email === 'dnpatel2002@gmail.com' || session.user.business?.assignedRole === 'SUPER_ADMIN')) {
      throw new Error('Super Admin session cannot be revoked or terminated.');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' },
    });

    return { sessionId, status: 'REVOKED' };
  }

  // Fetch Account Deletion Requests with database pagination
  static async getDeletionRequests(params: PaginationParams) {
    const { page, limit, skip, search, startDate, endDate, sortKey, sortOrder } = params;

    const where: any = {
      isDeletionRequested: true,
      email: { not: 'dnpatel2002@gmail.com' },
    };

    if (search && search.length > 0) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { business: { shopName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.updatedAt = {};
      if (startDate) where.updatedAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
        where.updatedAt.lte = end;
      }
    }

    let orderBy: any = { updatedAt: sortOrder };
    if (sortKey && ['updatedAt', 'fullName', 'email'].includes(sortKey)) {
      orderBy = { [sortKey]: sortOrder };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { business: true },
      }),
    ]);

    const formattedRequests = users.map((u) => ({
      userId: u.id,
      ownerName: u.fullName,
      shopName: u.business?.shopName || 'N/A',
      reason: u.deletionReason || 'No reason provided',
      requestedAt: u.updatedAt,
    }));

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      requests: formattedRequests,
      data: formattedRequests,
      totalRequests: total,
      pagination,
    };
  }

  // Confirm Permanent Account Deletion from PostgreSQL DB
  static async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (user && (user.email === 'dnpatel2002@gmail.com' || user.business?.assignedRole === 'SUPER_ADMIN')) {
      throw new Error('Super Admin account cannot be deleted.');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return { userId, deleted: true, message: `Account ${userId} permanently deleted by Super Admin.` };
  }

  static async adminEditBusiness(businessId: string, overrideData: any) {
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: overrideData,
    });
    return updated;
  }

  static async assignCommunities(businessId: string, allowedCommunities: string[]) {
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { allowedCommunities },
    });

    return {
      businessId: updated.id,
      allowedCommunities: updated.allowedCommunities,
      message: `Multi-community access granted for: ${allowedCommunities.join(', ')}.`,
    };
  }

  static async updateGroupCapacity(groupId: string, maxCapacity: number) {
    const { GroupService } = await import('../group/group.service');
    return GroupService.updateGroupCapacity(groupId, maxCapacity);
  }

  // ---------------- DYNAMIC COMMUNITY & CATEGORY CRUD ----------------

  static async getCommunities(includeInactive = true) {
    let communities = await prisma.community.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed defaults if database table is empty
    if (communities.length === 0) {
      const defaults = [
        { slug: 'clothing', name: 'Clothing & Textiles', description: 'Apparel, Shirts, Sarees & Garments', isActive: true },
        { slug: 'jewellery', name: 'Jewellery & Gems', description: 'Gold, Silver, 1 Gram & Imitation', isActive: true },
        { slug: 'electronics', name: 'Electronics & Mobiles', description: 'Mobiles, Gadgets & Accessories', isActive: true },
        { slug: 'footwear', name: 'Footwear & Leather', description: 'Shoes, Sandals & Bags', isActive: true },
        { slug: 'textiles', name: 'Textiles & Yarns', description: 'Raw Yarns & Fabrics', isActive: true },
        { slug: 'cosmetics', name: 'Cosmetics & Beauty', description: 'Beauty Products & Skincare', isActive: true },
        { slug: 'hardware', name: 'Hardware & Tools', description: 'Tools, Fasteners & Hardware', isActive: true },
        { slug: 'food', name: 'Food & Spices', description: 'Spices, Grains & Food Items', isActive: true },
        { slug: 'handicrafts', name: 'Handicrafts & Decor', description: 'Artisanal Decor & Crafts', isActive: true },
      ];

      for (const d of defaults) {
        await prisma.community.upsert({
          where: { slug: d.slug },
          update: {},
          create: d,
        });
      }

      communities = await prisma.community.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return communities.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }

  static async createCommunity(data: { name: string; slug?: string; description?: string; isActive?: boolean }) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Community/Category name is required.');
    }

    const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await prisma.community.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error(`Category with slug '${slug}' already exists.`);
    }

    const community = await prisma.community.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });

    return {
      message: `Category '${community.name}' created successfully!`,
      community,
    };
  }

  static async updateCommunity(id: string, data: { name?: string; slug?: string; description?: string; isActive?: boolean }) {
    const existing = await prisma.community.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found.');
    }

    let slug = existing.slug;
    if (data.slug || data.name) {
      slug = (data.slug || data.name || existing.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const updated = await prisma.community.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : existing.name,
        slug,
        description: data.description !== undefined ? data.description.trim() : existing.description,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
      },
    });

    return {
      message: `Category '${updated.name}' updated successfully!`,
      community: updated,
    };
  }

  static async deleteCommunity(id: string) {
    const existing = await prisma.community.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found.');
    }

    await prisma.community.delete({ where: { id } });

    return {
      message: `Category '${existing.name}' deleted successfully!`,
      deletedId: id,
    };
  }

  static async allocateCommunitiesToUser(userId: string, allowedCommunities: string[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (!allowedCommunities || !Array.isArray(allowedCommunities) || allowedCommunities.length === 0) {
      throw new Error('At least one allowed category must be provided.');
    }

    let updatedBusiness;
    if (user.business) {
      updatedBusiness = await prisma.business.update({
        where: { id: user.business.id },
        data: { allowedCommunities },
      });
    } else {
      updatedBusiness = await prisma.business.create({
        data: {
          userId: user.id,
          shopName: user.fullName + ' Business',
          streetAddress: 'Main Street',
          city: 'City',
          state: 'State',
          pincode: '000000',
          allowedCommunities,
        },
      });
    }

    return {
      userId: user.id,
      shopName: updatedBusiness.shopName,
      allowedCommunities: updatedBusiness.allowedCommunities,
      message: `Successfully allocated categories: [${allowedCommunities.join(', ')}] to ${user.fullName}.`,
    };
  }

  // ============================================================
  // DYNAMIC FEATURE FLAGS & MODULE MANAGEMENT
  // ============================================================
  static async getModulesAndFeatures() {
    const modules = await prisma.featureModule.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
          include: {
            permissions: true,
            limits: true,
          },
        },
      },
    });
    return modules;
  }

  static async toggleFeature(key: string, isEnabled: boolean, adminUserId: string, adminName: string = 'Super Admin') {
    const existing = await prisma.feature.findUnique({ where: { key } });
    if (!existing) throw new Error(`Feature ${key} not found.`);

    const updated = await prisma.feature.update({
      where: { key },
      data: { isEnabled },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: isEnabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
      targetResource: 'Feature',
      targetId: key,
      oldValue: { isEnabled: existing.isEnabled },
      newValue: { isEnabled: updated.isEnabled },
    });

    return updated;
  }

  static async updateFeature(key: string, data: any, adminUserId: string, adminName: string = 'Super Admin') {
    const existing = await prisma.feature.findUnique({ where: { key } });
    if (!existing) throw new Error(`Feature ${key} not found.`);

    const updated = await prisma.feature.update({
      where: { key },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        isEnabled: data.isEnabled ?? existing.isEnabled,
        webEnabled: data.webEnabled ?? existing.webEnabled,
        mobileEnabled: data.mobileEnabled ?? existing.mobileEnabled,
        adminEnabled: data.adminEnabled ?? existing.adminEnabled,
        userEnabled: data.userEnabled ?? existing.userEnabled,
        businessEnabled: data.businessEnabled ?? existing.businessEnabled,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        config: data.config ?? (existing.config as any),
      },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'FEATURE_UPDATED',
      targetResource: 'Feature',
      targetId: key,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  // ============================================================
  // DYNAMIC PERMISSIONS & ROLES MANAGEMENT
  // ============================================================
  static async getPermissions() {
    return prisma.permission.findMany({
      include: { feature: true },
      orderBy: { key: 'asc' },
    });
  }

  static async getCustomRoles() {
    return prisma.customRole.findMany({
      include: {
        permissions: {
          include: { role: true },
        },
        roleLimits: true,
        users: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createOrUpdateCustomRole(data: any, adminUserId: string, adminName: string = 'Super Admin') {
    const { id, name, description, isSystemRole, isActive, permissionKeys } = data;

    let roleObj;
    if (id) {
      const existing = await prisma.customRole.findUnique({ where: { id } });
      if (!existing) throw new Error('Role not found');
      
      // Protection for SUPER_ADMIN role
      if (existing.name === 'SUPER_ADMIN' && isActive === false) {
        throw new Error('SAFETY_VIOLATION: The SUPER_ADMIN role cannot be deactivated.');
      }

      roleObj = await prisma.customRole.update({
        where: { id },
        data: {
          description: description ?? existing.description,
          isActive: isActive ?? existing.isActive,
        },
      });
    } else {
      if (!name) throw new Error('Role name is required');
      roleObj = await prisma.customRole.create({
        data: {
          name: name.toUpperCase().replace(/[^A_Z0-9_]/g, '_'),
          description,
          isSystemRole: Boolean(isSystemRole),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }

    if (permissionKeys && Array.isArray(permissionKeys)) {
      // Delete existing role permissions and re-insert
      await prisma.rolePermission.deleteMany({ where: { roleId: roleObj.id } });
      const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

      for (const p of perms) {
        await prisma.rolePermission.create({
          data: {
            roleId: roleObj.id,
            permissionKey: p.key,
            featureKey: p.featureKey,
          },
        });
      }
    }

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: id ? 'ROLE_UPDATED' : 'ROLE_CREATED',
      targetResource: 'CustomRole',
      targetId: roleObj.id,
      newValue: { name: roleObj.name, permissionKeys },
    });

    return roleObj;
  }

  static async assignUserRole(userId: string, roleId: string, adminUserId: string, adminName: string = 'Super Admin') {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { business: true } });
    if (!user) throw new Error('User not found');

    const role = await prisma.customRole.findUnique({ where: { id: roleId } });
    if (!role) throw new Error('Role not found');

    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });

    // Update primary assignedRole on business record for compatibility
    if (user.business && ['SUPER_ADMIN', 'ADMIN', 'MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'TRADER', 'RETAILER'].includes(role.name)) {
      await prisma.business.update({
        where: { id: user.business.id },
        data: { assignedRole: role.name as any },
      });
    }

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'USER_ROLE_ASSIGNED',
      targetResource: 'User',
      targetId: userId,
      newValue: { roleName: role.name },
    });

    return { message: `Successfully assigned role ${role.name} to user ${user.fullName}.` };
  }

  // ============================================================
  // USER PERMISSION OVERRIDES
  // ============================================================
  static async getUserPermissionsAndOverrides(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: true,
        subscription: true,
      },
    });
    if (!user) throw new Error('User not found');

    const overrides = await prisma.userPermissionOverride.findMany({ where: { userId } });
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });
    const limits = await prisma.userLimitOverride.findMany({ where: { userId } });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        assignedRole: user.business?.assignedRole || 'USER',
      },
      overrides,
      userRoles,
      limitOverrides: limits,
    };
  }

  static async setUserPermissionOverride(
    userId: string,
    permissionKey: string,
    featureKey: string,
    isGranted: boolean,
    adminUserId: string,
    adminName: string = 'Super Admin'
  ) {
    const override = await prisma.userPermissionOverride.upsert({
      where: { userId_permissionKey: { userId, permissionKey } },
      update: { isGranted, featureKey },
      create: { userId, permissionKey, featureKey, isGranted },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: isGranted ? 'PERMISSION_OVERRIDE_GRANTED' : 'PERMISSION_OVERRIDE_DENIED',
      targetResource: 'UserPermissionOverride',
      targetId: userId,
      newValue: { permissionKey, isGranted },
    });

    return override;
  }

  static async removeUserPermissionOverride(userId: string, permissionKey: string, adminUserId: string, adminName: string = 'Super Admin') {
    await prisma.userPermissionOverride.deleteMany({
      where: { userId, permissionKey },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'PERMISSION_OVERRIDE_REMOVED',
      targetResource: 'UserPermissionOverride',
      targetId: userId,
      newValue: { permissionKey },
    });

    return { message: 'Permission override removed.' };
  }

  // ============================================================
  // DYNAMIC LIMITS MANAGEMENT
  // ============================================================
  static async getPlatformLimits() {
    return prisma.platformLimit.findMany({
      include: {
        feature: true,
        roleLimits: { include: { role: true } },
      },
      orderBy: { limitKey: 'asc' },
    });
  }

  static async updatePlatformLimit(limitKey: string, defaultValue: number, adminUserId: string, adminName: string = 'Super Admin') {
    const existing = await prisma.platformLimit.findUnique({ where: { limitKey } });
    if (!existing) throw new Error('Limit not found');

    const updated = await prisma.platformLimit.update({
      where: { limitKey },
      data: { defaultValue },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'LIMIT_UPDATED',
      targetResource: 'PlatformLimit',
      targetId: limitKey,
      oldValue: { defaultValue: existing.defaultValue },
      newValue: { defaultValue: updated.defaultValue },
    });

    return updated;
  }

  static async setRoleLimit(roleId: string, limitKey: string, value: number, adminUserId: string, adminName: string = 'Super Admin') {
    const limit = await prisma.roleLimit.upsert({
      where: { roleId_limitKey: { roleId, limitKey } },
      update: { value },
      create: { roleId, limitKey, value },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'ROLE_LIMIT_SET',
      targetResource: 'RoleLimit',
      targetId: roleId,
      newValue: { limitKey, value },
    });

    return limit;
  }

  static async setUserLimitOverride(userId: string, limitKey: string, value: number, adminUserId: string, adminName: string = 'Super Admin') {
    const limit = await prisma.userLimitOverride.upsert({
      where: { userId_limitKey: { userId, limitKey } },
      update: { value },
      create: { userId, limitKey, value },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'USER_LIMIT_OVERRIDE_SET',
      targetResource: 'UserLimitOverride',
      targetId: userId,
      newValue: { limitKey, value },
    });

    return limit;
  }

  // ============================================================
  // DYNAMIC SUBSCRIPTION PLAN MANAGEMENT
  // ============================================================
  static async getDynamicSubscriptionPlans() {
    return prisma.dynamicSubscriptionPlan.findMany({
      include: {
        planFeatures: { include: { feature: true } },
        planLimits: { include: { limit: true } },
      },
      orderBy: { price: 'asc' },
    });
  }

  static async createOrUpdateSubscriptionPlan(data: any, adminUserId: string, adminName: string = 'Super Admin') {
    const { id, name, slug, description, price, durationMonths, isActive, isDefault, featureMap, limitMap } = data;

    let planObj;
    if (id) {
      planObj = await prisma.dynamicSubscriptionPlan.update({
        where: { id },
        data: {
          name: name ?? undefined,
          description: description ?? undefined,
          price: price !== undefined ? Number(price) : undefined,
          durationMonths: durationMonths !== undefined ? Number(durationMonths) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
          isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        },
      });
    } else {
      if (!name || !slug) throw new Error('Plan name and slug are required');
      planObj = await prisma.dynamicSubscriptionPlan.create({
        data: {
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description,
          price: Number(price || 0),
          durationMonths: Number(durationMonths || 1),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          isDefault: Boolean(isDefault),
        },
      });
    }

    if (featureMap && typeof featureMap === 'object') {
      for (const [featureKey, isEnabled] of Object.entries(featureMap)) {
        await prisma.planFeature.upsert({
          where: { planId_featureKey: { planId: planObj.id, featureKey } },
          update: { isEnabled: Boolean(isEnabled) },
          create: { planId: planObj.id, featureKey, isEnabled: Boolean(isEnabled) },
        });
      }
    }

    if (limitMap && typeof limitMap === 'object') {
      for (const [limitKey, value] of Object.entries(limitMap)) {
        await prisma.planLimit.upsert({
          where: { planId_limitKey: { planId: planObj.id, limitKey } },
          update: { value: Number(value) },
          create: { planId: planObj.id, limitKey, value: Number(value) },
        });
      }
    }

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: id ? 'SUBSCRIPTION_PLAN_UPDATED' : 'SUBSCRIPTION_PLAN_CREATED',
      targetResource: 'DynamicSubscriptionPlan',
      targetId: planObj.id,
      newValue: { name: planObj.name, price: planObj.price },
    });

    return planObj;
  }

  // ============================================================
  // DYNAMIC PLATFORM SETTINGS & AUDIT LOGS
  // ============================================================
  static async getDynamicPlatformSettings() {
    return prisma.dynamicPlatformSetting.findMany({
      orderBy: { category: 'asc' },
    });
  }

  static async updateDynamicPlatformSetting(key: string, value: any, adminUserId: string, adminName: string = 'Super Admin') {
    const existing = await prisma.dynamicPlatformSetting.findUnique({ where: { key } });

    const updated = await prisma.dynamicPlatformSetting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        category: 'GENERAL',
        value,
        description: 'Dynamically updated setting',
      },
    });

    const { AuthorizationService } = await import('./authz.service');
    await AuthorizationService.logAudit({
      adminUserId,
      adminName,
      action: 'PLATFORM_SETTING_UPDATED',
      targetResource: 'DynamicPlatformSetting',
      targetId: key,
      oldValue: existing?.value,
      newValue: value,
    });

    return updated;
  }

  static async getAuditLogs(limit: number = 100) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // REAL-TIME DASHBOARD METRICS & SYSTEM ANALYTICS
  // ============================================================
  static async getRealTimeDashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      rejectedUsers,
      suspendedUsers,
      deletionUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      totalBusinesses,
      verifiedBusinesses,
      totalProducts,
      totalLeads,
      totalGroups,
      totalMessages,
      totalCalls,
      totalRevenue,
      revenueToday,
      activeSubscriptions,
      pendingPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'APPROVED' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'REJECTED' } }),
      prisma.user.count({ where: { status: 'BLOCKED' } }),
      prisma.user.count({ where: { isDeletionRequested: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.business.count(),
      prisma.business.count({ where: { verificationTag: true } }),
      prisma.product.count(),
      prisma.leadCapture.count(),
      prisma.group.count({ where: { isDeleted: false } }),
      prisma.message.count(),
      prisma.callLog.count(),
      prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', createdAt: { gte: todayStart } } }),
      prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.paymentTransaction.count({ where: { status: 'PENDING_VERIFICATION' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        approved: approvedUsers,
        pending: pendingUsers,
        rejected: rejectedUsers,
        suspended: suspendedUsers,
        deletionRequested: deletionUsers,
        newToday: newUsersToday,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
      },
      business: {
        total: totalBusinesses,
        verified: verifiedBusinesses,
      },
      content: {
        products: totalProducts,
        leads: totalLeads,
        groups: totalGroups,
        messages: totalMessages,
        calls: totalCalls,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        today: revenueToday._sum.amount || 0,
        activeSubscriptions,
        pendingPayments,
      },
    };
  }

  static async getSystemHealthMetrics() {
    const memory = process.memoryUsage();
    return {
      apiStatus: 'ONLINE',
      database: 'CONNECTED',
      memoryHeapMB: Math.round(memory.heapUsed / 1024 / 1024),
      memoryRssMB: Math.round(memory.rss / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
    };
  }

  // ============================================================
  // API ROUTE FLAGS & USER OVERRIDES
  // ============================================================
  static async getApiRouteFlags() {
    return prisma.apiRouteFlag.findMany({ orderBy: { module: 'asc' } });
  }

  static async toggleApiRouteFlag(path: string, isEnabled: boolean) {
    return prisma.apiRouteFlag.update({
      where: { path },
      data: { isEnabled },
    });
  }

  static async updateApiRouteFlag(path: string, data: any) {
    return prisma.apiRouteFlag.update({
      where: { path },
      data: {
        isEnabled: data.isEnabled,
        isRateLimitEnabled: data.isRateLimitEnabled,
        rateLimitPerMin: data.rateLimitPerMin,
        webEnabled: data.webEnabled,
        mobileEnabled: data.mobileEnabled,
        allowedRoles: data.allowedRoles,
        allowedPlans: data.allowedPlans,
      },
    });
  }

  static async setUserFeatureOverride(userId: string, featureKey: string, isEnabled: boolean) {
    return prisma.userFeatureOverride.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      update: { isEnabled },
      create: { userId, featureKey, isEnabled },
    });
  }

  static async setUserApiOverride(userId: string, routePath: string, method: string, isEnabled: boolean) {
    return prisma.userApiOverride.upsert({
      where: { userId_routePath_method: { userId, routePath, method: method || 'ALL' } },
      update: { isEnabled },
      create: { userId, routePath, method: method || 'ALL', isEnabled },
    });
  }
}


