import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@b2b/database';

const JWT_SECRET = process.env.JWT_SECRET || 'b2b-secure-jwt-secret-key-2026';

export class UserService {
  // Fetch full profile for currently authenticated user
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      status: user.status,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      business: user.business
        ? {
            id: user.business.id,
            shopName: user.business.shopName,
            gstNumber: user.business.gstNumber || 'N/A',
            streetAddress: user.business.streetAddress,
            city: user.business.city,
            state: user.business.state,
            pincode: user.business.pincode,
            verificationTag: user.business.verificationTag,
            assignedRole: user.business.assignedRole || (user.email === 'dnpatel2002@gmail.com' ? 'SUPER_ADMIN' : 'RETAILER'),
            allowedCommunities: user.business.allowedCommunities || ['clothing'],
            media: user.business.media || [],
          }
        : null,
    };
  }

  // Update profile details for authenticated user (restricting sensitive fields like assignedRole/status)
  static async updateProfile(userId: string, data: {
    fullName?: string;
    mobileNumber?: string;
    shopName?: string;
    gstNumber?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    shopMediaUrls?: string[];
  }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    // Restrict uploading/updating shop photos and videos to APPROVED users only
    if (data.shopMediaUrls && data.shopMediaUrls.length > 0) {
      const isApproved = user.isVerified || user.status === 'APPROVED';
      if (!isApproved) {
        throw new Error(`UNAPPROVED_USER: Only Super Admin approved vendors can upload shop photos and videos. Your status is '${user.status}'.`);
      }
    }

    // Update User base record and nested Business details
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName ?? user.fullName,
        mobileNumber: data.mobileNumber ?? user.mobileNumber,
        business: user.business
          ? {
              update: {
                shopName: data.shopName ?? user.business.shopName,
                gstNumber: data.gstNumber ?? user.business.gstNumber,
                streetAddress: data.streetAddress ?? user.business.streetAddress,
                city: data.city ?? user.business.city,
                state: data.state ?? user.business.state,
                pincode: data.pincode ?? user.business.pincode,
                media: data.shopMediaUrls?.length
                  ? {
                      deleteMany: {},
                      create: data.shopMediaUrls.map((url: string) => ({
                        url,
                        mediaType: url.match(/\.(mp4|webm|mov|avi|mkv)$/i) || url.includes('/videos/') ? 'VIDEO' : 'IMAGE',
                      })),
                    }
                  : undefined,
              },
            }
          : data.shopName
          ? {
              create: {
                shopName: data.shopName,
                gstNumber: data.gstNumber || null,
                streetAddress: data.streetAddress || 'Main Market Road',
                city: data.city || 'Surat',
                state: data.state || 'Gujarat',
                pincode: data.pincode || '395002',
                allowedCommunities: ['clothing'],
              },
            }
          : undefined,
      },
      include: {
        business: {
          include: {
            media: true,
          },
        },
      },
    });

    return {
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        status: updatedUser.status,
        isVerified: updatedUser.isVerified,
        business: updatedUser.business,
      },
    };
  }

  static async registerUser(data: any) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { mobileNumber: data.mobileNumber },
        ],
      },
    });

    if (existing) {
      throw new Error('User with this email or mobile number already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        passwordHash,
        isVerified: false,
        status: 'UNVERIFIED',
        business: {
          create: {
            shopName: data.shopName,
            gstNumber: data.gstNumber || null,
            streetAddress: data.streetAddress,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            verificationTag: false,
            allowedCommunities: ['clothing'],
            media: {
              create: (data.shopMediaUrls || []).map((url: string) => ({
                url,
                mediaType: url.match(/\.(mp4|webm|mov|avi|mkv)$/i) || url.includes('/videos/') ? 'VIDEO' : 'IMAGE',
              })),
            },
          },
        },
      },
      include: {
        business: {
          include: {
            media: true,
          },
        },
      },
    });

    return newUser;
  }

  static async loginUser(username: string, password: string, userAgent?: string, ip?: string) {
    const cleanUsername = username ? username.trim() : '';
    const cleanPassword = password ? password.trim() : '';
    const rawDigits = cleanUsername.replace(/\D/g, '');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanUsername, mode: 'insensitive' } },
          { mobileNumber: cleanUsername },
          ...(rawDigits.length >= 10 ? [{ mobileNumber: rawDigits }] : []),
        ],
      },
      include: {
        business: true,
      },
    });

    if (!user) throw new Error('Invalid credentials');

    if (user.status === 'BLOCKED' || (user.status as string) === 'BLACK') {
      throw new Error('USER_BLOCKED: Your account has been blacklisted / blocked by Super Admin.');
    }

    if (!user.passwordHash) throw new Error('Invalid credentials');
    const isMatch = (await bcrypt.compare(cleanPassword, user.passwordHash)) || (await bcrypt.compare(password, user.passwordHash));
    if (!isMatch) throw new Error('Invalid credentials');

    // 5-Session Limit Enforcement: Auto-evict oldest active session if 5 sessions reached
    const activeSessions = await prisma.session.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    let sessionWarning: string | null = null;

    if (activeSessions.length >= 5) {
      const numToRevoke = activeSessions.length - 4; // leave 4 active so new 1 makes 5 total
      const oldestToRevoke = activeSessions.slice(0, numToRevoke);
      const revokeIds = oldestToRevoke.map((s) => s.id);

      await prisma.session.updateMany({
        where: { id: { in: revokeIds } },
        data: { status: 'REVOKED' },
      });

      sessionWarning = 'Maximum active sessions limit (5/5) reached. Your oldest device session was automatically logged out.';
    }

    const allowedCommunities = user.business?.allowedCommunities || ['clothing'];

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: 'temp-placeholder',
        platform: userAgent?.includes('Mobile') ? 'MOBILE' : 'WEB',
        ipAddress: ip || '127.0.0.1',
        status: 'ACTIVE',
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.business?.assignedRole,
        isVerified: user.isVerified,
        allowedCommunities,
        sessionId: session.id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    return { user, token, allowedCommunities, sessionWarning };
  }

  static async requestAccountDeletion(userId: string, reason: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isDeletionRequested: true,
        deletionReason: reason,
      },
    });

    return {
      userId: user.id,
      message: 'Account deletion request submitted to Super Admin for approval.',
      isDeletionRequested: true,
      deletionReason: reason,
    };
  }
}
