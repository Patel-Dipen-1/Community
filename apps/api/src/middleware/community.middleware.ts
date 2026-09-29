import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '@b2b/database';

export const requireVerifiedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Super Admin or primary admin email is always verified
  if (req.user?.role === 'SUPER_ADMIN' || req.user?.email === 'dnpatel2002@gmail.com') {
    if (req.user) req.user.isVerified = true;
    return next();
  }

  // Check live DB verification status
  if (req.user?.userId) {
    try {
      const userRecord = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { status: true, isVerified: true },
      });

      if (userRecord && (userRecord.isVerified || userRecord.status === 'APPROVED')) {
        req.user.isVerified = true;
        return next();
      }
    } catch (err) {
      // Fallback to token
    }
  }

  if (!req.user?.isVerified) {
    return res.status(403).json({
      error: 'Account pending Super Admin verification. Feeds, search, and directory locked.',
      isVerified: false
    });
  }

  next();
};

export const enforceCommunityIsolation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const requestedCommunityId = (
    req.query.communityId ||
    req.body.communityId ||
    req.headers['x-community-id'] ||
    'clothing'
  ) as string;

  // Super Admin or dnpatel2002@gmail.com can access all communities
  if (req.user?.role === 'SUPER_ADMIN' || req.user?.email === 'dnpatel2002@gmail.com') {
    (req as any).activeCommunityId = requestedCommunityId;
    return next();
  }

  // Check user's allowed communities array (e.g. ['clothing'])
  const allowedCommunities: string[] = (req.user as any)?.allowedCommunities || ['clothing'];

  const isAllowed = allowedCommunities.some(
    c => c.toLowerCase() === requestedCommunityId.toLowerCase()
  );

  if (!isAllowed && requestedCommunityId.toLowerCase() !== 'clothing') {
    return res.status(403).json({
      error: `Access Denied: You do not have permission to view '${requestedCommunityId}'. By default, users can access the clothing community.`,
      requestedCommunity: requestedCommunityId,
      yourAllowedCommunities: allowedCommunities,
    });
  }

  (req as any).activeCommunityId = requestedCommunityId;
  next();
};
