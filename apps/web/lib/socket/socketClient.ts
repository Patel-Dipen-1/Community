import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../api/config';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_CONFIG.BASE_URL.replace('/api/v1', ''), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function registerSocketUser(userId: string) {
  const s = getSocket();
  if (s && userId) {
    s.emit('register_user', userId);
  }
}

export function joinSocketConversation(conversationId: string) {
  const s = getSocket();
  if (s && conversationId) {
    s.emit('join_conversation', conversationId);
  }
}

export function joinSocketGroup(groupId: string) {
  const s = getSocket();
  if (s && groupId) {
    s.emit('join_group', groupId);
  }
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
