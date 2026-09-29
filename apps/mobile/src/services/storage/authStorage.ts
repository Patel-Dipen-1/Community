import * as SecureStore from 'expo-secure-store';
import { ENV_CONFIG } from '../../constants/config';
import { UserProfile } from '../../types/auth.types';

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ENV_CONFIG.TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving JWT token to SecureStore:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ENV_CONFIG.TOKEN_KEY);
    } catch (error) {
      console.error('Error reading JWT token from SecureStore:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ENV_CONFIG.TOKEN_KEY);
    } catch (error) {
      console.error('Error deleting JWT token from SecureStore:', error);
    }
  },

  async saveUser(user: UserProfile): Promise<void> {
    try {
      await SecureStore.setItemAsync(ENV_CONFIG.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving User profile to SecureStore:', error);
    }
  },

  async getUser(): Promise<UserProfile | null> {
    try {
      const raw = await SecureStore.getItemAsync(ENV_CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error reading User profile from SecureStore:', error);
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      SecureStore.deleteItemAsync(ENV_CONFIG.USER_KEY).catch(() => {}),
    ]);
  },
};
