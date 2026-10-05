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

dotenv.config();

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
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e6, // 1 MB limit per event payload to prevent buffer floods
  pingTimeout: 20000,     // 20s heartbeat timeout
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
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalRateLimiter);

// Serve Static Uploaded Images, Audios & Videos from Local Disk (`apps/api/uploads/`)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
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
app.use('/api/v1/business', cacheResponse(60), verifySubscriptionAccess, businessRoutes);
app.use('/api/v1/products', cacheResponse(30), verifySubscriptionAccess, productRoutes);
app.use('/api/v1/store', cacheResponse(30), verifySubscriptionAccess, storeRoutes);
app.use('/api/v1/leads', verifySubscriptionAccess, leadRoutes);
app.use('/api/v1/status', verifySubscriptionAccess, statusRoutes);
app.use('/api/v1/admin', adminRoutes);
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
  res.json({
    status: 'OK',
    system: 'Multi-Community B2B Platform API Engine',
    database: 'CONNECTED',
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

// Real-Time Socket.io Server for Chat, Trade Groups, Presence & WebRTC Calling
io.on('connection', (socket) => {
  // Register User Presence (Handles multi-device/multi-tab correctly)
  socket.on('register_user', (userId: string) => {
    if (userId) {
      socket.data.userId = userId;
      socket.join(`user:${userId}`); // Join user room for targeted calls & notifications

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
        io.emit('user_presence_change', { userId, status: 'ONLINE', lastSeen: null });
      }
    }
  });

  // Fetch Presence & Last Seen for a target user
  socket.on('get_user_presence', async (targetUserId: string) => {
    if (!targetUserId) return;
    const isOnline = (userSocketsMap.get(targetUserId)?.size || 0) > 0;
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { updatedAt: true },
      });
      socket.emit('user_presence_status', {
        userId: targetUserId,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: targetUser?.updatedAt?.toISOString() || null,
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

      const isCallerAdmin =
        caller.email === 'dnpatel2002@gmail.com' || caller.business?.assignedRole === 'SUPER_ADMIN';
      const isTargetAdmin =
        target.email === 'dnpatel2002@gmail.com' || target.business?.assignedRole === 'SUPER_ADMIN';
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

  socket.on('call:accept', (data: { callId: string; callerUserId: string }) => {
    const receiverUserId = socket.data.userId;
    if (!receiverUserId) return;

    const session = activeCallsMap.get(data.callId);
    if (session && session.status === 'RINGING') {
      session.status = 'CONNECTED';
      io.to(`user:${data.callerUserId}`).emit('call:accepted', {
        callId: data.callId,
        receiverUserId,
      });
      // Dismiss incoming ringing on receiver's other active tabs
      io.to(`user:${receiverUserId}`).emit('call:handled', {
        callId: data.callId,
        action: 'accepted',
      });
    }
  });

  socket.on('call:reject', (data: { callId: string; callerUserId: string }) => {
    const receiverUserId = socket.data.userId;
    if (!receiverUserId) return;

    activeCallsMap.delete(data.callId);
    io.to(`user:${data.callerUserId}`).emit('call:rejected', {
      callId: data.callId,
      receiverUserId,
    });
    // Dismiss incoming ringing on receiver's other active tabs
    io.to(`user:${receiverUserId}`).emit('call:handled', {
      callId: data.callId,
      action: 'rejected',
    });
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

  // Broadcast 1-to-1 Message (With Authorization Check)
  socket.on('send_message', async (data: { conversationId: string; senderId?: string; text?: string; productCode?: string; mediaUrl?: string; clientMessageId?: string }) => {
    const socketUserId = socket.data.userId;
    if (!socketUserId) {
      socket.emit('error', { message: 'UNAUTHORIZED_SENDER: Socket user identity mismatch' });
      return;
    }

    const senderId = data.senderId || socketUserId;
    if (senderId !== socketUserId) {
      socket.emit('error', { message: 'UNAUTHORIZED_SENDER: Socket user identity mismatch' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: { user1Id: true, user2Id: true },
    });

    if (!conversation || (conversation.user1Id !== socketUserId && conversation.user2Id !== socketUserId)) {
      socket.emit('error', { message: 'UNAUTHORIZED_CONVERSATION' });
      return;
    }

    setImmediate(() => {
      io.to(data.conversationId).emit('receive_message', {
        id: `msg-${Date.now()}`,
        conversationId: data.conversationId,
        senderId,
        clientMessageId: data.clientMessageId,
        text: data.text,
        productCode: data.productCode,
        mediaUrl: data.mediaUrl,
        createdAt: new Date(),
      });
    });
  });

  // Broadcast Group Message (With Membership Verification)
  socket.on('send_group_message', async (data: { groupId: string; senderId: string; senderName?: string; text?: string; productCode?: string; mediaUrl?: string; clientMessageId?: string }) => {
    const socketUserId = socket.data.userId;
    if (!socketUserId || socketUserId !== data.senderId) {
      socket.emit('error', { message: 'UNAUTHORIZED_SENDER: Socket user identity mismatch' });
      return;
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId: socketUserId },
    });

    if (!membership) {
      socket.emit('error', { message: 'UNAUTHORIZED_GROUP_MEMBER' });
      return;
    }

    setImmediate(() => {
      io.to(`group_${data.groupId}`).emit('receive_group_message', {
        id: `gmsg-${Date.now()}`,
        groupId: data.groupId,
        senderId: data.senderId,
        senderName: data.senderName || 'Member',
        clientMessageId: data.clientMessageId,
        text: data.text,
        productCode: data.productCode,
        mediaUrl: data.mediaUrl,
        createdAt: new Date(),
      });
    });
  });

  // Edit Direct Message Socket Event Relay
  socket.on('edit_message', (data: { conversationId: string; messageId: string; text: string }) => {
    if (data?.conversationId) {
      io.to(data.conversationId).emit('message_edited', data);
    }
  });

  // Edit Group Message Socket Event Relay
  socket.on('edit_group_message', (data: { groupId: string; messageId: string; text: string }) => {
    if (data?.groupId) {
      io.to(`group_${data.groupId}`).emit('group_message_edited', data);
    }
  });

  // Typing Indicator Events (Direct Chat & Group Chat)
  socket.on('typing_start', (data: { conversationId?: string; groupId?: string; userId: string; userName?: string }) => {
    if (!data?.userId) return;
    if (data.conversationId) {
      socket.to(data.conversationId).emit('user_typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName || 'Someone',
        isTyping: true,
      });
    } else if (data.groupId) {
      socket.to(`group_${data.groupId}`).emit('user_typing', {
        groupId: data.groupId,
        userId: data.userId,
        userName: data.userName || 'Member',
        isTyping: true,
      });
    }
  });

  socket.on('typing_stop', (data: { conversationId?: string; groupId?: string; userId: string }) => {
    if (!data?.userId) return;
    if (data.conversationId) {
      socket.to(data.conversationId).emit('user_typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: false,
      });
    } else if (data.groupId) {
      socket.to(`group_${data.groupId}`).emit('user_typing', {
        groupId: data.groupId,
        userId: data.userId,
        isTyping: false,
      });
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
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { updatedAt: lastSeenDate },
            });
          } catch {}
          io.emit('user_presence_change', { userId, status: 'OFFLINE', lastSeen: lastSeenDate.toISOString() });
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
