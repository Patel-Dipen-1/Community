/**
 * Environment & API Configuration for Mobile App
 * Supports dynamic configuration for Development, Staging, and Production.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolves dev host IP address:
 * - Uses Expo debuggerHost / hostUri if available (e.g. 192.168.x.x when running via Expo CLI on Wi-Fi)
 * - Android Emulator fallback: 10.0.2.2
 * - Web/iOS fallback: localhost
 */
const getDevHost = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || (Constants.manifest as any)?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
};

const devHost = getDevHost();
const DEV_API_URL = `http://${devHost}:5000/api/v1`;
const DEV_SOCKET_URL = `http://${devHost}:5000`;

const PROD_API_URL = 'https://communityapi.radheytechsolutions.com/api/v1';
const PROD_SOCKET_URL = 'https://communityapi.radheytechsolutions.com';

export const ENV_CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || PROD_API_URL,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || PROD_SOCKET_URL,
  DEV_API_URL,
  APP_NAME: 'B2B Community Platform',
  APP_VERSION: '1.0.0',
  TOKEN_KEY: 'b2b_auth_token',
  USER_KEY: 'b2b_auth_user',
};

