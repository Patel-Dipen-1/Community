import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@b2b/database';
import { JWT_SECRET } from '../config/jwt';
import { isSuperAdminUser } from '../utils/superAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
    isVerified: boolean;
    sessionId?: string;
    allowedCommunities?: string[];
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
    if (err || !decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // BUG-043: Active session validation against database
    if (decoded.sessionId) {
      try {
        const session = await prisma.session.findUnique({
          where: { id: decoded.sessionId },
          select: { status: true },
        });

        if (!session || session.status !== 'ACTIVE') {
          return res.status(401).json({
            error: 'SESSION_REVOKED',
            message: 'Your session has been terminated or revoked. Please log in again.',
          });
        }
      } catch (dbErr: any) {
        // Fallback gracefully on temporary DB glitch, still permitting valid JWT
      }
    }

    req.user = decoded;
    next();
  });
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // BUG-035: Check Super Admin via centralized utility
  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({ error: 'Super Admin privileges required' });
  }
  next();
};
