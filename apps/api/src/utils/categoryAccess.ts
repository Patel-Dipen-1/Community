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

  const isApproved = Boolean(user.isVerified || user.status === 'APPROVED');
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
  if (!user1Categories || !user2Categories) return false;

  const set2 = new Set(user2Categories.map((c) => c.toLowerCase()));
  return user1Categories.some((c) => set2.has(c.toLowerCase()));
}

/**
 * Verify Direct Chat eligibility between two users:
 * 1. Both users must have status = 'APPROVED' (or isVerified)
 * 2. Both users must share at least ONE active trade category
 */
export async function verifyDirectChatAccess(senderId: string, recipientId: string) {
  const [sender, recipient] = await Promise.all([
    getUserCategoryProfile(senderId),
    getUserCategoryProfile(recipientId),
  ]);

  if (!sender) {
    throw new Error('Sender user account not found.');
  }

  if (!sender.isApproved && !sender.isSuperAdmin) {
    throw new Error(
      `RESTRICTED_NOT_APPROVED: Your account status is '${sender.status}'. Direct Chat is available only when both users are APPROVED.`
    );
  }

  if (!recipient) {
    throw new Error('Recipient user account not found.');
  }

  if (!recipient.isApproved && !sender.isSuperAdmin) {
    throw new Error(
      `RESTRICTED_NOT_APPROVED: User '${recipient.fullName}' is not APPROVED (status: '${recipient.status}'). Direct Chat is available only when both users are APPROVED.`
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
