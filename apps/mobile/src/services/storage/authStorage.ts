import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ENV_CONFIG } from '../../constants/config';
import { UserProfile } from '../../types/auth.types';

const isWeb = Platform.OS === 'web';

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(ENV_CONFIG.TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(ENV_CONFIG.TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error saving JWT token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(ENV_CONFIG.TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(ENV_CONFIG.TOKEN_KEY);
    } catch (error) {
      console.error('Error reading JWT token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(ENV_CONFIG.TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(ENV_CONFIG.TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error deleting JWT token:', error);
    }
  },

  async saveUser(user: UserProfile): Promise<void> {
    try {
      const dataStr = JSON.stringify(user);
      if (isWeb) {
        localStorage.setItem(ENV_CONFIG.USER_KEY, dataStr);
      } else {
        await SecureStore.setItemAsync(ENV_CONFIG.USER_KEY, dataStr);
      }
    } catch (error) {
      console.error('Error saving User profile:', error);
    }
  },

  async getUser(): Promise<UserProfile | null> {
    try {
      const raw = isWeb ? localStorage.getItem(ENV_CONFIG.USER_KEY) : await SecureStore.getItemAsync(ENV_CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error reading User profile:', error);
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      isWeb ? Promise.resolve(localStorage.removeItem(ENV_CONFIG.USER_KEY)) : SecureStore.deleteItemAsync(ENV_CONFIG.USER_KEY).catch(() => {}),
    ]);
  },
};
