/**
 * Centralized API Global Environment Configuration
 * 
 * Provides robust base URL normalization ensuring /api/v1 prefix is automatically present.
 */

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl.endsWith('/api/v1')) return envUrl;
    return `${envUrl.replace(/\/$/, '')}/api/v1`;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname.includes('radheytechsolutions.com') || hostname !== 'localhost') {
      return 'https://communityapi.radheytechsolutions.com/api/v1';
    }
  }

  return 'http://localhost:5000/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 15000,
};
