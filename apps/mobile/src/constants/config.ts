/**
 * Environment & API Configuration for Mobile App
 * Supports dynamic configuration for Development, Staging, and Production.
 */

// Default Local Dev VPS / Machine IP (Replace with actual server IP or domain in production)
const DEV_API_URL = 'http://localhost:5000/api/v1';
const DEV_SOCKET_URL = 'http://localhost:5000';

export const ENV_CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || DEV_SOCKET_URL,
  APP_NAME: 'B2B Community Platform',
  APP_VERSION: '1.0.0',
  TOKEN_KEY: 'b2b_auth_token',
  USER_KEY: 'b2b_auth_user',
};
