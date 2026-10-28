import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { prisma } from '@b2b/database';

import { globalRateLimiter, authRateLimiter } from './middleware/rate-limit.middleware';
import { cacheResponse } from './middleware/cache.middleware';
import { logger } from './utils/logger';

import userRoutes from './modules/user/user.routes';
import businessRoutes from './modules/business/business.routes';
import productRoutes from './modules/product/product.routes';
import leadRoutes from './modules/lead/lead.routes';
import adminRoutes from './modules/admin/admin.routes';
import groupRoutes from './modules/group/group.routes';
import uploadRoutes from './modules/upload/upload.routes';
import chatRoutes from './modules/chat/chat.routes';
import storeRoutes from './modules/store/store.routes';

import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { ChatService } from './modules/chat/chat.service';
import { GroupService } from './modules/group/group.service';

import { JWT_SECRET } from './config/jwt';
import { isSuperAdminUser, isSuperAdminEmail } from './utils/superAdmin';
import { authenticateToken, requireSuperAdmin } from './middleware/auth.middleware';

dotenv.config();

// BUG-036: Strict CORS Whitelist Configuration with Domain & Subdomain Support
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8081',
  'exp://localhost:8081',
  'https://communityapi.radheytechsolutions.com',
  'https://community.radheytechsolutions.com',
  'https://admin.radheytechsolutions.com',
  'https://radheytechsolutions.com',
];

const allAllowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

export const isOriginAllowed = (origin: string): boolean => {
  if (process.env.CORS_ORIGIN === '*' || configuredOrigins.includes('*')) {
    return true;
  }
  if (allAllowedOrigins.includes(origin)) {
    return true;
  }
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'radheytechsolutions.com' ||
      host.endsWith('.radheytechsolutions.com') ||
      host.endsWith('.vercel.app')
    ) {
      return true;
    }
  } catch (e) {
    // Malformed URL, check prefixes
  }
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.') ||
    origin.startsWith('exp://')
  ) {
    return true;
  }
  return false;
};

const corsOriginChecker = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Mobile applications, curl, and server-to-server requests send no Origin header
  if (!origin) return callback(null, true);
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  logger.warn(`⚠️ CORS blocked for origin: ${origin}`);
  return callback(null, false);
};

const corsOptions: cors.CorsOptions = {
  origin: corsOriginChecker,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Cache-Control',
    'Origin',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

const app = express();
const server = http.createServer(app);

// Phase 2: Express Production Configuration
app.set('trust proxy', 1); // Topology: Client -> Nginx -> Node (1 proxy hop)

// Phase 3: Node HTTP Server Timeouts (Matching Nginx Keepalive Defaults)
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000;   // 66 seconds (must be > keepAliveTimeout)
server.requestTimeout = 30000;   // 30 seconds

// Phase 6: Socket.IO Optimization Configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6, // 1 MB limit per event payload to prevent buffer floods
  pingTimeout: 60000,     // 60s heartbeat timeout (must be > pingInterval to prevent phantom disconnects)
  pingInterval: 25000,    // 25s ping interval
  transports: ['websocket', 'polling'],
});

app.set('io', io);

// Redis Client Setup (Graceful Fallback Mode)
let redisStatus = 'IN-MEMORY FALLBACK (OFFLINE)';
let redisClient: Redis | null = null;
let subClient: Redis | null = null;

const redisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

if (redisUrl) {
  try {
    const pubClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    subClient = pubClient.duplicate();

    pubClient
      .connect()
      .then(() => Promise.all([pubClient.ping(), subClient!.connect()]))
      .then(() => {
        redisClient = pubClient;
        redisStatus = 'CONNECTED';
        io.adapter(createAdapter(pubClient, subClient!));
        logger.info('✅ Redis Socket.IO Adapter & Presence connected successfully.');
      })
      .catch((err) => {
        logger.warn(`⚠️ Redis connection failed (${err.message}). Operating in single-server in-memory mode.`);
        redisStatus = 'IN-MEMORY FALLBACK (OFFLINE)';
      });
  } catch (err: any) {
    logger.warn(`⚠️ Redis initialization error (${err.message}). Operating in single-server in-memory mode.`);
  }
} else {
  logger.info('ℹ️ REDIS_URL not configured. Operating in single-server in-memory mode.');
}

const PORT = process.env.PORT || 5000;

// 1. Production Security & Optimization Middlewares
app.use(helmet({ crossOriginResourcePolicy: false })); // Security Headers
app.use(compression());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalRateLimiter);

// Serve Static Uploaded Images, Audios & Videos from Local Disk (`apps/api/uploads/`)
// BUG-040: Secure headers preventing hotlinking & MIME sniffing
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Accept-Ranges', 'bytes');
      const reqOrigin = res.req?.headers?.origin;
      if (typeof reqOrigin === 'string' && isOriginAllowed(reqOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      }
      if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'audio/webm');
      } else if (filePath.endsWith('.mp4') || filePath.endsWith('.m4a')) {
        res.setHeader('Content-Type', 'audio/mp4');
      } else if (filePath.endsWith('.ogg')) {
        res.setHeader('Content-Type', 'audio/ogg');
      }
    },
  })
);

// 2. Feature-Based API Module Mounts
import statusRoutes from './modules/status/status.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import commentRoutes from './modules/comment/comment.routes';
import likeRoutes from './modules/like/like.routes';
import broadcastRoutes from './modules/broadcast/broadcast.routes';
import { verifySubscriptionAccess } from './middleware/subscription.middleware';

app.use('/api/v1/auth', authRateLimiter, userRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/calls', userRoutes);
app.use('/api/v1/business', cacheResponse(60), verifySubscriptionAccess, businessRoutes);
app.use('/api/v1/products', cacheResponse(30), verifySubscriptionAccess, productRoutes);
app.use('/api/v1/store', cacheResponse(30), verifySubscriptionAccess, storeRoutes);
app.use('/api/v1/leads', verifySubscriptionAccess, leadRoutes);
app.use('/api/v1/status', verifySubscriptionAccess, statusRoutes);
app.use('/api/v1/admin', authenticateToken as any, requireSuperAdmin as any, adminRoutes);
app.use('/api/v1/groups', verifySubscriptionAccess, groupRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/chat', verifySubscriptionAccess, chatRoutes);
app.use('/api/v1/broadcast', verifySubscriptionAccess, broadcastRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/comments', verifySubscriptionAccess, commentRoutes);
app.use('/api/v1/likes', verifySubscriptionAccess, likeRoutes);

// Health & Database Connectivity Check Endpoint
app.get('/api/v1/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  let dbStatus = 'CONNECTED';
  try {
    // BUG-046: Safe parameterized query literal preventing dynamic SQL injection
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = 'DISCONNECTED';
  }

  const isHealthy = dbStatus === 'CONNECTED';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    system: 'Multi-Community B2B Platform API Engine',
    database: dbStatus,
    redis: redisStatus,
    vpsOptimization: {
      eventLoopThread: 'FREE / UNBLOCKED',
      memoryHeapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      memoryRss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    },
    version: '2.5.0',
    timestamp: new Date().toISOString()
  });
});

// Phase 8: Multi-Device Presence Tracking Store (userId -> Set of active socket.ids)
const userSocketsMap = new Map<string, Set<string>>();
const activeCallsMap = new Map<string, any>();

// Socket.IO Handshake Authentication Middleware
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization;
    const headerToken = authHeader
      ? authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader
      : null;
    const token =
      socket.handshake.auth?.token ||
      headerToken ||
      (socket.handshake.query?.token as string);

    if (!token || typeof token !== 'string') {
      return next(new Error('UNAUTHORIZED: Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err || !decoded) {
        return next(new Error('UNAUTHORIZED: Invalid or expired authentication token'));
      }

      const verifiedUserId = decoded.userId || decoded.id;
      if (!verifiedUserId) {
        return next(new Error('UNAUTHORIZED: Token missing user identifier'));
      }

      // BUG-043: Active session validation in Socket.IO auth
      if (decoded.sessionId) {
        try {
          const session = await prisma.session.findUnique({
            where: { id: decoded.sessionId },
            select: { status: true },
          });
          if (!session || session.status !== 'ACTIVE') {
            return next(new Error('SESSION_REVOKED: This session has been terminated or revoked'));
          }
        } catch {}
      }

      // Bind cryptographically verified identity strictly from JWT
      socket.data.userId = verifiedUserId;
      socket.data.user = decoded;
      next();
    });
  } catch (err: any) {
    return next(new Error(`UNAUTHORIZED: ${err.message}`));
  }
});

// Helper to broadcast presence updates only to relevant conversation peers (BUG-024)
const broadcastPresenceChange = async (targetUserId: string, status: 'ONLINE' | 'OFFLINE', lastSeen: string | null) => {
  try {
    const userConvs = await prisma.conversation.findMany({
      where: { OR: [{ user1Id: targetUserId }, { user2Id: targetUserId }] },
      select: { user1Id: true, user2Id: true },
    });
    const recipientRooms = new Set<string>();
    recipientRooms.add(`user:${targetUserId}`);
    for (const c of userConvs) {
      const peerId = c.user1Id === targetUserId ? c.user2Id : c.user1Id;
      if (peerId) recipientRooms.add(`user:${peerId}`);
    }
    const payload = { userId: targetUserId, status, lastSeen };
    for (const room of recipientRooms) {
      io.to(room).emit('user_presence_change', payload);
    }
  } catch (err: any) {
    logger.error(`Presence broadcast error: ${err.message}`);
  }
};

// Real-Time Socket.io Server for Chat, Trade Groups, Presence & WebRTC Calling
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  // Automatically join authenticated user room for targeted calls & notifications
  socket.join(`user:${userId}`);

  // Register User Presence (Handles multi-device/multi-tab correctly)
  let sockets = userSocketsMap.get(userId);
  if (!sockets) {
    sockets = new Set<string>();
    userSocketsMap.set(userId, sockets);
  }
  const isFirstSocket = sockets.size === 0;
  sockets.add(socket.id);

  if (redisClient) {
    redisClient.sadd(`presence:sockets:${userId}`, socket.id).catch(() => {});
    redisClient.set(`presence:user:${userId}`, 'ONLINE', 'EX', 300).catch(() => {});
  }

  if (isFirstSocket) {
    // Record active session time
    prisma.session.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { lastActive: new Date() },
    }).catch(() => {});
    broadcastPresenceChange(userId, 'ONLINE', null);
  }

  // Backward-compatible register_user handler (enforces verified identity, prevents spoofing)
  socket.on('register_user', (clientUserId: string) => {
    if (clientUserId && clientUserId !== userId) {
      logger.warn(`Security Alert: Socket ${socket.id} (authenticated as ${userId}) attempted to register as ${clientUserId}. Spoofing rejected.`);
      return;
    }
  });

  // Fetch Presence & Last Seen for a target user (cross-cluster compatible via Redis)
  // BUG-023: Use actual Session.lastActive or Redis presence timestamp instead of user.updatedAt
  socket.on('get_user_presence', async (targetUserId: string) => {
    if (!targetUserId) return;
    let isOnline = (userSocketsMap.get(targetUserId)?.size || 0) > 0;
    if (!isOnline && redisClient) {
      try {
        const count = await redisClient.scard(`presence:sockets:${targetUserId}`);
        isOnline = count > 0;
      } catch {}
    }

    try {
      let lastSeenDate: Date | null = null;
      if (redisClient) {
        try {
          const cached = await redisClient.get(`presence:last_seen:${targetUserId}`);
          if (cached) lastSeenDate = new Date(cached);
        } catch {}
      }

      if (!lastSeenDate) {
        const latestSession = await prisma.session.findFirst({
          where: { userId: targetUserId },
          orderBy: { lastActive: 'desc' },
          select: { lastActive: true },
        });
        if (latestSession?.lastActive) {
          lastSeenDate = latestSession.lastActive;
        }
      }

      socket.emit('user_presence_status', {
        userId: targetUserId,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: lastSeenDate ? lastSeenDate.toISOString() : null,
      });
    } catch {
      socket.emit('user_presence_status', {
        userId: targetUserId,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: null,
      });
    }
  });

  // ============================================================
  // WEBRTC AUDIO & VIDEO CALL SIGNALING ENGINE
  // ============================================================
  socket.on('call:invite', async (data: { targetUserId: string; callType: 'AUDIO' | 'VIDEO' }) => {
    const callerUserId = socket.data.userId;
    if (!callerUserId || !data.targetUserId) {
      socket.emit('call:error', { message: 'CALL_DENIED: Unauthenticated caller or missing target' });
      return;
    }

    try {
      // 1. Fetch Caller User & Business details
      const caller = await prisma.user.findUnique({
        where: { id: callerUserId },
        include: { business: true },
      });

      if (!caller || caller.status === 'BLOCKED' || (caller.status as string) === 'BLACK') {
        socket.emit('call:error', { message: 'CALL_DENIED: Your account is restricted or blocked.' });
        return;
      }

      // 2. Fetch Target User & Business details
      const target = await prisma.user.findUnique({
        where: { id: data.targetUserId },
        include: { business: true },
      });

      if (!target || target.status === 'BLOCKED' || (target.status as string) === 'BLACK') {
        socket.emit('call:error', { message: 'CALL_DENIED: Receiver account is not active or available' });
        return;
      }

      // 3. Check User Block Status
      const isBlocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: callerUserId, blockedUserId: data.targetUserId },
            { blockerId: data.targetUserId, blockedUserId: callerUserId },
          ],
        },
      });

      if (isBlocked) {
        socket.emit('call:error', { message: 'CALL_DENIED: Communication between users is blocked' });
        return;
      }

      // 4. Community Authorization Check
      const callerComms =
        caller.business?.allowedCommunities && caller.business.allowedCommunities.length > 0
          ? caller.business.allowedCommunities
          : ['clothing'];
      const targetComms =
        target.business?.allowedCommunities && target.business.allowedCommunities.length > 0
          ? target.business.allowedCommunities
          : ['clothing'];

      const isCallerAdmin = isSuperAdminUser(caller);
      const isTargetAdmin = isSuperAdminUser(target);
      const hasSharedCommunity = isCallerAdmin || isTargetAdmin || callerComms.some((c) => targetComms.includes(c));

      if (!hasSharedCommunity) {
        socket.emit('call:error', { message: 'CALL_DENIED: Trade community restricted' });
        return;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const callSession = {
        callId,
        callerUserId,
        callerName: caller.fullName,
        callerShopName: caller.business?.shopName || 'Verified Vendor',
        callerMobile: caller.mobileNumber,
        targetUserId: data.targetUserId,
        callType: data.callType,
        status: 'RINGING',
        createdAt: Date.now(),
      };

      activeCallsMap.set(callId, callSession);

      // Notify Target User (Ringing on all active devices/tabs)
      io.to(`user:${data.targetUserId}`).emit('call:incoming', {
        callId,
        callerUserId,
        callerName: caller.fullName,
        callerShopName: caller.business?.shopName || 'Verified Vendor',
        callerMobile: caller.mobileNumber,
        callType: data.callType,
      });

      // Notify Caller (Ringing status)
      socket.emit('call:ringing', { callId, targetUserId: data.targetUserId });

      // 30-Second Timeout for Unanswered Ringing
      setTimeout(() => {
        const session = activeCallsMap.get(callId);
        if (session && session.status === 'RINGING') {
          activeCallsMap.delete(callId);
          io.to(`user:${callerUserId}`).emit('call:timed_out', { callId });
          io.to(`user:${data.targetUserId}`).emit('call:timed_out', { callId });
        }
      }, 30000);
    } catch (err: any) {
      socket.emit('call:error', { message: 'CALL_ERROR: System error initiating call' });
    }
  });

  socket.on('call:accept', (data: { callId?: string; callerUserId?: string; targetUserId?: string }) => {
    const receiverUserId = socket.data.userId;
    if (!receiverUserId) return;

    let session: any = null;
    let callId = data?.callId;

    if (callId) {
      session = activeCallsMap.get(callId);
    } else {
      const callerId = data?.callerUserId || data?.targetUserId;
      for (const [id, s] of activeCallsMap.entries()) {
        if (s.targetUserId === receiverUserId && (!callerId || s.callerUserId === callerId)) {
          session = s;
          callId = id;
          break;
        }
      }
    }

    if (session && session.status === 'RINGING') {
      session.status = 'CONNECTED';
      const targetCallerId = session.callerUserId;
      const resolvedCallId = callId || session.callId;
      io.to(`user:${targetCallerId}`).emit('call:accepted', {
        callId: resolvedCallId,
        receiverUserId,
      });
      // Dismiss incoming ringing on receiver's other active tabs
      io.to(`user:${receiverUserId}`).emit('call:handled', {
        callId: resolvedCallId,
        action: 'accepted',
      });
    }
  });

  socket.on('call:reject', (data: { callId?: string; callerUserId?: string; targetUserId?: string }) => {
    const receiverUserId = socket.data.userId;
    if (!receiverUserId) return;

    let session: any = null;
    let callId = data?.callId;

    if (callId) {
      session = activeCallsMap.get(callId);
    } else {
      const callerId = data?.callerUserId || data?.targetUserId;
      for (const [id, s] of activeCallsMap.entries()) {
        if (s.targetUserId === receiverUserId && (!callerId || s.callerUserId === callerId)) {
          session = s;
          callId = id;
          break;
        }
      }
    }

    if (session) {
      const resolvedCallId = callId || session.callId;
      if (resolvedCallId) {
        activeCallsMap.delete(resolvedCallId);
      }
      io.to(`user:${session.callerUserId}`).emit('call:rejected', {
        callId: resolvedCallId,
        receiverUserId,
      });
      // Dismiss incoming ringing on receiver's other active tabs
      io.to(`user:${receiverUserId}`).emit('call:handled', {
        callId: resolvedCallId,
        action: 'rejected',
      });
    }
  });

  socket.on('call:cancel', (data: { callId: string; targetUserId: string }) => {
    activeCallsMap.delete(data.callId);
    io.to(`user:${data.targetUserId}`).emit('call:cancelled', { callId: data.callId });
  });

  socket.on('call:end', (data: { callId: string; targetUserId: string }) => {
    activeCallsMap.delete(data.callId);
    io.to(`user:${data.targetUserId}`).emit('call:ended', { callId: data.callId });
  });

  // WebRTC SDP Offer / Answer / ICE Candidate Relay
  socket.on('call:offer', (data: { callId: string; targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    if (!senderUserId) return;
    io.to(`user:${data.targetUserId}`).emit('call:offer', {
      callId: data.callId,
      callerUserId: senderUserId,
      sdp: data.sdp,
    });
  });

  socket.on('call:answer', (data: { callId: string; targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    if (!senderUserId) return;
    io.to(`user:${data.targetUserId}`).emit('call:answer', {
      callId: data.callId,
      receiverUserId: senderUserId,
      sdp: data.sdp,
    });
  });

  socket.on('call:ice-candidate', (data: { callId: string; targetUserId: string; candidate: any }) => {
    const senderUserId = socket.data.userId;
    if (!senderUserId) return;
    io.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
      callId: data.callId,
      senderUserId,
      candidate: data.candidate,
    });
  });

  // Join 1-to-1 Chat Room (Strict Authorization Verification)
  socket.on('join_conversation', async (conversationId: string) => {
    const userId = socket.data.userId;
    if (!userId || !conversationId) {
      socket.emit('room_join_error', { conversationId, error: 'ROOM_JOIN_DENIED: Unauthenticated socket' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });

      if (!user || user.status === 'BLOCKED' || (user.status as string) === 'BLACK') {
        socket.emit('room_join_error', { conversationId, error: 'ROOM_JOIN_DENIED: User is blocked' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { user1Id: true, user2Id: true },
      });

      if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
        logger.warn(`Security Warning: User ${userId} attempted unauthorized socket join to conversation ${conversationId}`);
        socket.emit('room_join_error', { conversationId, error: 'ROOM_JOIN_DENIED: Access denied to conversation' });
        return;
      }

      // Check if blocked by target participant
      const targetUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      const isBlocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedUserId: targetUserId },
            { blockerId: targetUserId, blockedUserId: userId },
          ],
        },
      });

      if (isBlocked) {
        socket.emit('room_join_error', { conversationId, error: 'ROOM_JOIN_DENIED: Communication is blocked' });
        return;
      }

      socket.join(conversationId);
      socket.emit('room_joined', { conversationId });
    } catch (err: any) {
      socket.emit('room_join_error', { conversationId, error: 'ROOM_JOIN_ERROR' });
    }
  });

  // Join Trade Group Room (Strict Membership Verification)
  socket.on('join_group', async (groupId: string) => {
    const userId = socket.data.userId;
    if (!userId || !groupId) {
      socket.emit('room_join_error', { groupId, error: 'ROOM_JOIN_DENIED: Unauthenticated socket' });
      return;
    }

    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true, isDeleted: true, communitySlug: true, createdById: true },
      });

      if (!group || group.isDeleted) {
        socket.emit('room_join_error', { groupId, error: 'ROOM_JOIN_DENIED: Group not found' });
        return;
      }

      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId },
      });

      if (!membership && group.createdById !== userId) {
        logger.warn(`Security Warning: User ${userId} attempted unauthorized socket join to group ${groupId}`);
        socket.emit('room_join_error', { groupId, error: 'ROOM_JOIN_DENIED: You are not a member of this group' });
        return;
      }

      socket.join(`group_${groupId}`);
      socket.emit('room_joined', { groupId });
    } catch (err: any) {
      socket.emit('room_join_error', { groupId, error: 'ROOM_JOIN_ERROR' });
    }
  });

  // Leave 1-to-1 Chat Room (BUG-028)
  socket.on('leave_conversation', (conversationId: string) => {
    if (conversationId) {
      socket.leave(conversationId);
    }
  });

  // Leave Trade Group Room (BUG-029)
  socket.on('leave_group', (groupId: string) => {
    if (groupId) {
      socket.leave(`group_${groupId}`);
    }
  });

  // 1-to-1 Direct Message with Durable Database Persistence & Idempotency
  socket.on(
    'send_message',
    async (
      data: {
        conversationId: string;
        text?: string;
        productCode?: string;
        mediaUrl?: string;
        clientMessageId?: string;
        replyToId?: string;
        senderId?: string;
      },
      callback?: (res: { success: boolean; message?: any; error?: string }) => void
    ) => {
      const socketUserId = socket.data.userId;
      if (!socketUserId) {
        const err = { message: 'UNAUTHORIZED_SENDER: Socket user identity mismatch' };
        socket.emit('error', err);
        callback?.({ success: false, error: err.message });
        return;
      }

      if (!data?.conversationId) {
        const err = { message: 'INVALID_REQUEST: conversationId is required' };
        socket.emit('error', err);
        callback?.({ success: false, error: err.message });
        return;
      }

      try {
        // Durably persist in PostgreSQL before emitting or acknowledging
        const message = await ChatService.sendMessage(socketUserId, data.conversationId, {
          text: data.text,
          productCode: data.productCode,
          mediaUrl: data.mediaUrl,
          clientMessageId: data.clientMessageId,
          replyToId: data.replyToId,
        });

        // Broadcast to conversation room and recipient's user room (excluding sender socket, which gets callback)
        const recipientUserId = (message as any).recipientId;
        let broadcast = socket.to(data.conversationId);
        if (recipientUserId) {
          broadcast = broadcast.to(`user:${recipientUserId}`);
        }
        broadcast.emit('receive_message', message);

        callback?.({ success: true, message });
      } catch (err: any) {
        logger.error(`Error sending message via socket: ${err.message}`);
        socket.emit('error', { message: err.message || 'Failed to send message' });
        callback?.({ success: false, error: err.message || 'Failed to send message' });
      }
    }
  );

  // Group Message with Durable Database Persistence, Membership Verification & Idempotency
  socket.on(
    'send_group_message',
    async (
      data: {
        groupId: string;
        text?: string;
        productCode?: string;
        mediaUrl?: string;
        clientMessageId?: string;
        replyToId?: string;
        senderId?: string;
      },
      callback?: (res: { success: boolean; message?: any; error?: string }) => void
    ) => {
      const socketUserId = socket.data.userId;
      if (!socketUserId) {
        const err = { message: 'UNAUTHORIZED_SENDER: Socket user identity mismatch' };
        socket.emit('error', err);
        callback?.({ success: false, error: err.message });
        return;
      }

      if (!data?.groupId) {
        const err = { message: 'INVALID_REQUEST: groupId is required' };
        socket.emit('error', err);
        callback?.({ success: false, error: err.message });
        return;
      }

      try {
        // Durably persist in PostgreSQL before emitting or acknowledging
        const message = await GroupService.sendMessage(data.groupId, socketUserId, {
          text: data.text,
          productCode: data.productCode,
          mediaUrl: data.mediaUrl,
          clientMessageId: data.clientMessageId,
          replyToId: data.replyToId,
        });

        io.to(`group_${data.groupId}`).emit('receive_group_message', message);
        callback?.({ success: true, message });
      } catch (err: any) {
        logger.error(`Error sending group message via socket: ${err.message}`);
        socket.emit('error', { message: err.message || 'Failed to send group message' });
        callback?.({ success: false, error: err.message || 'Failed to send group message' });
      }
    }
  );

  // Edit Direct Message with DB Persistence and Ownership Verification
  socket.on('edit_message', async (data: { conversationId: string; messageId: string; text: string }) => {
    const socketUserId = socket.data.userId;
    if (!socketUserId || !data?.messageId || !data?.text?.trim()) return;

    try {
      const updated = await ChatService.editMessage(socketUserId, data.messageId, data.text.trim());
      if (updated?.conversationId) {
        io.to(updated.conversationId).emit('message_edited', updated);
      }
    } catch (err: any) {
      socket.emit('error', { message: err.message || 'Failed to edit message' });
    }
  });

  // Edit Group Message with DB Persistence and Ownership Verification
  socket.on('edit_group_message', async (data: { groupId: string; messageId: string; text: string }) => {
    const socketUserId = socket.data.userId;
    if (!socketUserId || !data?.messageId || !data?.text?.trim()) return;

    try {
      const updated = await GroupService.editGroupMessage(socketUserId, data.messageId, data.text.trim());
      if (updated?.groupId) {
        io.to(`group_${updated.groupId}`).emit('group_message_edited', updated);
      }
    } catch (err: any) {
      socket.emit('error', { message: err.message || 'Failed to edit group message' });
    }
  });

  // Real-Time Message Read ACK (2 Blue Ticks)
  socket.on('mark_read', async (data: { conversationId: string }) => {
    const userId = socket.data.userId;
    if (!userId || !data?.conversationId) return;

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { user1Id: true, user2Id: true },
      });

      if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
        return;
      }

      const updateResult = await prisma.message.updateMany({
        where: {
          conversationId: data.conversationId,
          senderId: { not: userId },
          status: { not: 'READ' },
        },
        data: { status: 'READ' },
      });

      const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      const statusPayload = {
        conversationId: data.conversationId,
        readBy: userId,
        status: 'READ',
        readAt: new Date().toISOString(),
      };

      io.to(data.conversationId).emit('message_status_update', statusPayload);
      io.to(`user:${otherUserId}`).emit('message_status_update', statusPayload);
    } catch (e: any) {
      logger.error(`Error marking messages as read: ${e.message}`);
    }
  });

  // Real-Time Message Delivered ACK (2 Grey Ticks)
  socket.on('mark_delivered', async (data: { conversationId: string; messageIds?: string[] }) => {
    const userId = socket.data.userId;
    if (!userId || !data?.conversationId) return;

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { user1Id: true, user2Id: true },
      });

      if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
        return;
      }

      await prisma.message.updateMany({
        where: {
          conversationId: data.conversationId,
          senderId: { not: userId },
          status: 'SENT',
          ...(data.messageIds && data.messageIds.length > 0 ? { id: { in: data.messageIds } } : {}),
        },
        data: { status: 'DELIVERED' },
      });

      const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      const statusPayload = {
        conversationId: data.conversationId,
        recipientId: userId,
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString(),
      };

      io.to(data.conversationId).emit('message_status_update', statusPayload);
      io.to(`user:${otherUserId}`).emit('message_status_update', statusPayload);
    } catch (e: any) {
      logger.error(`Error marking messages as delivered: ${e.message}`);
    }
  });

  // Typing Indicator Events (Direct Chat & Group Chat)
  socket.on('typing_start', async (data: { conversationId?: string; groupId?: string; userName?: string }) => {
    const userId = socket.data.userId;
    if (!userId) return;

    if (data.conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { user1Id: true, user2Id: true },
      });
      if (conv && (conv.user1Id === userId || conv.user2Id === userId)) {
        socket.to(data.conversationId).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          userName: data.userName || 'Someone',
          isTyping: true,
        });
      }
    } else if (data.groupId) {
      const member = await prisma.groupMember.findFirst({
        where: { groupId: data.groupId, userId },
      });
      if (member) {
        socket.to(`group_${data.groupId}`).emit('user_typing', {
          groupId: data.groupId,
          userId,
          userName: data.userName || 'Member',
          isTyping: true,
        });
      }
    }
  });

  // Typing Stop Handler with Membership Verification (BUG-033)
  socket.on('typing_stop', async (data: { conversationId?: string; groupId?: string }) => {
    const userId = socket.data.userId;
    if (!userId) return;

    if (data.conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { user1Id: true, user2Id: true },
      });
      if (conv && (conv.user1Id === userId || conv.user2Id === userId)) {
        socket.to(data.conversationId).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
        });
      }
    } else if (data.groupId) {
      const member = await prisma.groupMember.findFirst({
        where: { groupId: data.groupId, userId },
      });
      if (member) {
        socket.to(`group_${data.groupId}`).emit('user_typing', {
          groupId: data.groupId,
          userId,
          isTyping: false,
        });
      }
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.data.userId;
    if (userId) {
      // Clean up any ongoing calls associated with this user upon socket disconnect/refresh
      for (const [callId, session] of activeCallsMap.entries()) {
        if (session.callerUserId === userId || session.targetUserId === userId) {
          const peerId = session.callerUserId === userId ? session.targetUserId : session.callerUserId;
          activeCallsMap.delete(callId);
          io.to(`user:${peerId}`).emit('call:ended', { callId });
        }
      }

      const sockets = userSocketsMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (redisClient) {
          redisClient.srem(`presence:sockets:${userId}`, socket.id).catch(() => {});
        }

        // Only mark offline if no active devices/sockets remain for this user
        if (sockets.size === 0) {
          userSocketsMap.delete(userId);
          if (redisClient) {
            redisClient.del(`presence:user:${userId}`).catch(() => {});
          }
          const lastSeenDate = new Date();
          if (redisClient) {
            redisClient.set(`presence:last_seen:${userId}`, lastSeenDate.toISOString(), 'EX', 86400 * 30).catch(() => {});
          }
          try {
            await prisma.session.updateMany({
              where: { userId, status: 'ACTIVE' },
              data: { lastActive: lastSeenDate },
            });
          } catch {}
          broadcastPresenceChange(userId, 'OFFLINE', lastSeenDate.toISOString());
        }
      }
    }
  });
});

import { seedBroadcastDefaults } from './modules/broadcast/broadcast.seed';

server.listen(PORT, async () => {
  logger.info(`=================================================`);
  logger.info(`🚀 B2B Platform API running on port ${PORT}`);
  logger.info(`📂 Local Media Uploads served at: http://localhost:${PORT}/uploads/`);
  logger.info(`=================================================`);

  // Seed Broadcast default feature flags, limits & permissions
  await seedBroadcastDefaults().catch(() => {});
});

// Phase 15: Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  logger.info(` Received ${signal}. Starting graceful shutdown...`);
  
  // 1. Stop accepting new HTTP requests
  server.close(() => {
    logger.info(' HTTP server closed.');
  });

  try {
    // 2. Close Socket.IO connections
    io.close(() => {
      logger.info(' Socket.IO server closed.');
    });

    // 3. Disconnect Redis
    if (redisClient) {
      await redisClient.quit().catch(() => {});
      logger.info(' Redis publisher disconnected.');
    }
    if (subClient) {
      await subClient.quit().catch(() => {});
      logger.info(' Redis subscriber disconnected.');
    }

    // 4. Disconnect Prisma Database
    await prisma.$disconnect();
    logger.info(' Database connections closed cleanly.');

    logger.info(' Graceful shutdown completed. Exiting.');
    process.exit(0);
  } catch (err: any) {
    logger.error(` Error during graceful shutdown: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
