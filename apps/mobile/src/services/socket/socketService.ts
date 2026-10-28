import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../storage/authStorage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private activeConversationId: string | null = null;
  private activeGroupIds: Set<string> = new Set();

  async connect(): Promise<Socket | null> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await authStorage.getToken();
    if (!token) {
      return null;
    }

    this.socket = io(ENV_CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Mobile Socket connected:', this.socket?.id);
      // Auto-rearm rooms upon connection / reconnection
      if (this.activeConversationId && this.socket) {
        this.socket.emit('join_conversation', this.activeConversationId);
      }
      if (this.socket && this.activeGroupIds.size > 0) {
        this.activeGroupIds.forEach((gid) => {
          this.socket?.emit('join_group', gid);
        });
      }
    });

    // Reattach all active event listeners if socket reconnected
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const cb of callbacks) {
        this.socket.on(event, cb);
      }
    }

    this.socket.on('disconnect', (reason) => {
      console.log('⚡ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚡ Socket connection error:', error.message);
    });

    return this.socket;
  }

  joinConversation(conversationId: string): void {
    this.activeConversationId = conversationId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  joinGroup(groupId: string): void {
    this.activeGroupIds.add(groupId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_group', groupId);
    }
  }

  leaveGroup(groupId: string): void {
    this.activeGroupIds.delete(groupId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_group', groupId);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) this.connect();

    const existing = this.listeners.get(event) || [];
    if (existing.includes(callback)) {
      return; // BUG-030: Prevent duplicate listener accumulation
    }

    if (this.socket) {
      this.socket.on(event, callback);
    }

    this.listeners.set(event, [...existing, callback]);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }

    if (callback) {
      const existing = this.listeners.get(event) || [];
      this.listeners.set(
        event,
        existing.filter((cb) => cb !== callback)
      );
    } else {
      this.listeners.delete(event);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
