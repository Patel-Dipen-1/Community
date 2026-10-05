import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../storage/authStorage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

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
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚡ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚡ Socket connection error:', error.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) this.connect();

    if (this.socket) {
      this.socket.on(event, callback);
    }

    const existing = this.listeners.get(event) || [];
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
