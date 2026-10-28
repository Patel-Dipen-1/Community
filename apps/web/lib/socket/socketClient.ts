import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../api/config';

let socket: Socket | null = null;
let activeConversationId: string | null = null;
const activeGroupIds = new Set<string>();
let currentUserId: string | null = null;

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || localStorage.getItem('b2b_auth_token') || null;
};

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_CONFIG.BASE_URL.replace('/api/v1', ''), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: (cb) => {
        cb({ token: getAuthToken() });
      },
    });

    // Auto-rearm rooms & presence upon reconnect
    socket.on('connect', () => {
      if (currentUserId && socket) {
        socket.emit('register_user', currentUserId);
      }
      if (activeConversationId && socket) {
        socket.emit('join_conversation', activeConversationId);
      }
      if (socket && activeGroupIds.size > 0) {
        activeGroupIds.forEach((gid) => {
          socket?.emit('join_group', gid);
        });
      }
    });
  }
  return socket;
}

export function registerSocketUser(userId: string) {
  currentUserId = userId;
  const s = getSocket();
  if (s && userId && s.connected) {
    s.emit('register_user', userId);
  }
}

export function joinSocketConversation(conversationId: string) {
  activeConversationId = conversationId;
  const s = getSocket();
  if (s && conversationId && s.connected) {
    s.emit('join_conversation', conversationId);
  }
}

export function leaveSocketConversation(conversationId: string) {
  if (activeConversationId === conversationId) {
    activeConversationId = null;
  }
}

export function joinSocketGroup(groupId: string) {
  activeGroupIds.add(groupId);
  const s = getSocket();
  if (s && groupId && s.connected) {
    s.emit('join_group', groupId);
  }
}

export function leaveSocketGroup(groupId: string) {
  activeGroupIds.delete(groupId);
}

export function emitTypingStart(data: { conversationId?: string; groupId?: string; userId: string; userName?: string }) {
  const s = getSocket();
  if (s && data.userId) {
    s.emit('typing_start', data);
  }
}

export function emitTypingStop(data: { conversationId?: string; groupId?: string; userId: string }) {
  const s = getSocket();
  if (s && data.userId) {
    s.emit('typing_stop', data);
  }
}

export function requestUserPresence(targetUserId: string) {
  const s = getSocket();
  if (s && targetUserId) {
    s.emit('get_user_presence', targetUserId);
  }
}
