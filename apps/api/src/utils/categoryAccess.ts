import { prisma } from '@b2b/database';

export interface UserCategoryProfile {
  userId: string;
  fullName: string;
  mobileNumber: string;
  status: string;
  isVerified: boolean;
  isApproved: boolean;
  isSuperAdmin: boolean;
  allowedCommunities: string[];
}

/**
 * Fetch a user's account approval status and active category profile.
 */
export async function getUserCategoryProfile(userId: string): Promise<UserCategoryProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });

  if (!user) return null;

  const isApproved = Boolean(user.status !== 'BLOCKED' && (user.status as string) !== 'BLACK');
  const isSuperAdmin =
    user.email === 'dnpatel2002@gmail.com' || user.business?.assignedRole === 'SUPER_ADMIN';
  const allowedCommunities = user.business?.allowedCommunities || ['clothing'];

  return {
    userId: user.id,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    status: user.status,
    isVerified: user.isVerified,
    isApproved,
    isSuperAdmin,
    allowedCommunities,
  };
}

/**
 * Check if two category lists share at least one common category.
 * Always true if isSuperAdmin is true.
 */
export function hasMatchingCategory(
  user1Categories: string[],
  user2Categories: string[],
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!user1Categories || !user2Categories || user1Categories.length === 0 || user2Categories.length === 0) return true;

  const set2 = new Set(user2Categories.map((c) => c.toLowerCase()));
  return user1Categories.some((c) => set2.has(c.toLowerCase()));
}

/**
 * Verify Direct Chat eligibility between two users:
 * 1. Both users must be active (not BLOCKED)
 * 2. Both users share trade categories or general access
 */
export async function verifyDirectChatAccess(senderId: string, recipientId: string) {
  const [sender, recipient] = await Promise.all([
    getUserCategoryProfile(senderId),
    getUserCategoryProfile(recipientId),
  ]);

  if (!sender) {
    throw new Error('Sender user account not found.');
  }

  if (!sender.isApproved) {
    throw new Error(
      `USER_BLOCKED: Your account status is '${sender.status}'. Direct Chat is disabled for blocked accounts.`
    );
  }

  if (!recipient) {
    throw new Error('Recipient user account not found.');
  }

  if (!recipient.isApproved) {
    throw new Error(
      `USER_BLOCKED: User '${recipient.fullName}' is currently blocked.`
    );
  }

  const isSuperAdmin = sender.isSuperAdmin || recipient.isSuperAdmin;
  const sharesCategory = hasMatchingCategory(
    sender.allowedCommunities,
    recipient.allowedCommunities,
    isSuperAdmin
  );

  if (!sharesCategory) {
    throw new Error(
      'COMMUNITY_RESTRICTED: Direct Chat is permitted only between users who share at least one trade category. You cannot start or continue chat with users from completely different categories.'
    );
  }

  return { sender, recipient };
}
